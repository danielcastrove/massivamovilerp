import { GET } from './route';
import { prisma } from '@/lib/db';
import axios from 'axios';

// Mocking the dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    tasaBcv: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Helper to create a mock HTML response
const createMockHtml = (rate: string, date: string) => `
  <div id="dolar">
    <strong>${rate}</strong>
  </div>
  <div class="pull-right">
    <span class="date-display-single">${date}</span>
  </div>
`;

describe('BCV Scraping Cron Job (Idempotent Logic)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  });

  test('should handle a normal day-to-day update', async () => {
    // Arrange
    const lastRateDate = new Date(Date.UTC(2025, 3, 16)); // Wednesday, April 16, 2025
    const lastRate = {
      id: 'some-uuid-1',
      fecha_fin: lastRateDate,
    };
    (prisma.tasaBcv.findFirst as jest.Mock).mockResolvedValue(lastRate);

    const mockRate = '36,1234';
    const mockDateStr = 'Jueves 17 Abril 2025';
    const newFechaValor = new Date(Date.UTC(2025, 3, 17)); // Thursday, April 17, 2025
    mockedAxios.get.mockResolvedValue({ data: createMockHtml(mockRate, mockDateStr) });

    // Act
    await GET();

    // Assert
    expect(prisma.tasaBcv.findFirst).toHaveBeenCalledWith({ orderBy: { fecha_fin: 'desc' } });
    expect(prisma.tasaBcv.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.tasaBcv.upsert).toHaveBeenCalledWith({
      where: { fecha_efectiva: newFechaValor },
      create: {
        tasa: 36.1234,
        fecha_efectiva: newFechaValor,
        fecha_inicio: newFechaValor, // Should be lastRate.fecha_fin + 1 day
        fecha_fin: newFechaValor,
      },
      update: {
        tasa: 36.1234,
      },
    });
  });

  test('should handle a weekend gap correctly', async () => {
    // Arrange
    const lastRateDate = new Date(Date.UTC(2025, 3, 18)); // Friday, April 18, 2025
    const lastRate = {
      id: 'some-uuid-2',
      fecha_fin: lastRateDate,
    };
    (prisma.tasaBcv.findFirst as jest.Mock).mockResolvedValue(lastRate);

    const mockRate = '36,2345';
    const mockDateStr = 'Lunes 21 Abril 2025';
    const newFechaValor = new Date(Date.UTC(2025, 3, 21)); // Monday, April 21, 2025
    mockedAxios.get.mockResolvedValue({ data: createMockHtml(mockRate, mockDateStr) });

    // Act
    await GET();

    // Assert
    const expectedStartDate = new Date(Date.UTC(2025, 3, 19)); // Saturday, April 19, 2025
    expect(prisma.tasaBcv.upsert).toHaveBeenCalledWith({
      where: { fecha_efectiva: newFechaValor },
      create: {
        tasa: 36.2345,
        fecha_efectiva: newFechaValor,
        fecha_inicio: expectedStartDate, // Should be Friday + 1 day
        fecha_fin: newFechaValor,
      },
      update: {
        tasa: 36.2345,
      },
    });
  });

  test('should handle an extended holiday (Semana Santa) gap', async () => {
    // Arrange
    // Maundy Thursday is a holiday, so last rate is from Wednesday
    const lastRateDate = new Date(Date.UTC(2025, 3, 16)); // Wednesday, April 16, 2025
    const lastRate = {
      id: 'some-uuid-3',
      fecha_fin: lastRateDate,
    };
    (prisma.tasaBcv.findFirst as jest.Mock).mockResolvedValue(lastRate);

    // Next rate is published on the following Monday
    const mockRate = '36,3456';
    const mockDateStr = 'Lunes 21 Abril 2025';
    const newFechaValor = new Date(Date.UTC(2025, 3, 21)); // Monday, April 21, 2025
    mockedAxios.get.mockResolvedValue({ data: createMockHtml(mockRate, mockDateStr) });

    // Act
    await GET();

    // Assert
    // The new rate should start on Thursday the 17th, covering the whole holiday period.
    const expectedStartDate = new Date(Date.UTC(2025, 3, 17)); // Thursday, April 17, 2025
    expect(prisma.tasaBcv.upsert).toHaveBeenCalledWith({
      where: { fecha_efectiva: newFechaValor },
      create: {
        tasa: 36.3456,
        fecha_efectiva: newFechaValor,
        fecha_inicio: expectedStartDate, // Should be Wednesday + 1 day
        fecha_fin: newFechaValor,
      },
      update: {
        tasa: 36.3456,
      },
    });
  });

  test('should be idempotent and only update tasa on subsequent runs for the same day', async () => {
    // Arrange: First run (CREATE)
    const lastRateDate = new Date(Date.UTC(2025, 3, 18)); // Friday
    const lastRate = { id: 'some-uuid-4', fecha_fin: lastRateDate };
    (prisma.tasaBcv.findFirst as jest.Mock).mockResolvedValue(lastRate);

    const mockRate = '36,4567';
    const mockDateStr = 'Lunes 21 Abril 2025';
    const newFechaValor = new Date(Date.UTC(2025, 3, 21)); // Monday
    mockedAxios.get.mockResolvedValue({ data: createMockHtml(mockRate, mockDateStr) });
    
    // Act: First call
    await GET();

    // Assert: First call creates the record with correct dates
    const expectedStartDate = new Date(Date.UTC(2025, 3, 19)); // Saturday
    expect(prisma.tasaBcv.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.tasaBcv.upsert).toHaveBeenCalledWith({
      where: { fecha_efectiva: newFechaValor },
      create: {
        tasa: 36.4567,
        fecha_efectiva: newFechaValor,
        fecha_inicio: expectedStartDate,
        fecha_fin: newFechaValor,
      },
      update: {
        tasa: 36.4567,
      },
    });

    // Arrange: Second run on the same day, axios might return a slightly different rate string
    const mockRateUpdated = '36,4568';
    mockedAxios.get.mockResolvedValue({ data: createMockHtml(mockRateUpdated, mockDateStr) });

    // Act: Second call
    await GET();

    // Assert: Second call is an update, only for the tasa
    expect(prisma.tasaBcv.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.tasaBcv.upsert).toHaveBeenLastCalledWith({
      where: { fecha_efectiva: newFechaValor },
      create: expect.any(Object), // The create object is the same
      update: {
        tasa: 36.4568, // Only tasa is updated
      },
    });
  });

  test('should handle initial run where no previous rates exist', async () => {
    // Arrange
    (prisma.tasaBcv.findFirst as jest.Mock).mockResolvedValue(null);
    const mockRate = '36,0001';
    const mockDateStr = 'Lunes 14 Abril 2025';
    const newFechaValor = new Date(Date.UTC(2025, 3, 14));
    mockedAxios.get.mockResolvedValue({ data: createMockHtml(mockRate, mockDateStr) });

    // Act
    await GET();

    // Assert
    expect(prisma.tasaBcv.upsert).toHaveBeenCalledWith({
      where: { fecha_efectiva: newFechaValor },
      create: {
        tasa: 36.0001,
        fecha_efectiva: newFechaValor,
        fecha_inicio: newFechaValor, // On first run, start date is the effective date
        fecha_fin: newFechaValor,
      },
      update: {
        tasa: 36.0001,
      },
    });
  });
});