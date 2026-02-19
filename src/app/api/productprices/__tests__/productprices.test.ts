import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../route';
import { prisma } from '@/lib/db';

// Mock the prisma client
jest.mock('@/lib/db', () => ({
  prisma: {
    productPrice: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    parametro: { // Added mock for prisma.parametro
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('Product Prices API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.parametro.findUnique as jest.Mock).mockResolvedValue({
      value: '36.5', // Mock a default BCV rate
    });
  });

  // --- GET Tests ---
  describe('GET /api/productprices', () => {
    it('should return product prices for a given price_list_id', async () => {
      const mockProduct1 = { id: 'prod1', name: 'Product 1', category: { id: 'cat1', name: 'Category 1' } };
      const mockProduct2 = { id: 'prod2', name: 'Product 2', category: { id: 'cat2', name: 'Category 2' } };
      const mockPricesResolved = [
        { product_id: 'prod1', price_usd: new (require('decimal.js'))(10.0), product: mockProduct1 },
        { product_id: 'prod2', price_usd: new (require('decimal.js'))(20.0), product: mockProduct2 },
      ];
      (prisma.productPrice.findMany as jest.Mock).mockResolvedValue(mockPricesResolved);

      const req = new NextRequest('http://localhost/api/productprices?price_list_id=list1');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual([
        { product_id: 'prod1', price_usd: 10.0, approx_price_bs: 365.0, product: { ...mockProduct1, category: { id: 'cat1', name: 'Category 1' } } },
        { product_id: 'prod2', price_usd: 20.0, approx_price_bs: 730.0, product: { ...mockProduct2, category: { id: 'cat2', name: 'Category 2' } } },
      ]);
      expect(prisma.productPrice.findMany).toHaveBeenCalledWith({
        where: { price_list_id: 'list1' },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });
    });

    it('should return product prices for a given product_id', async () => {
      const mockPrices = [
        { price_list_id: 'list1', price_usd: 10.0 },
        { price_list_id: 'list2', price_usd: 15.0 },
      ];
      (prisma.productPrice.findMany as jest.Mock).mockResolvedValue(
        mockPrices.map(p => ({ ...p, price_usd: new (require('decimal.js'))(p.price_usd) }))
      );

      const req = new NextRequest('http://localhost/api/productprices?product_id=prod1');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual([
        { price_list_id: 'list1', price_usd: 10.0 },
        { price_list_id: 'list2', price_usd: 15.0 },
      ]);
      expect(prisma.productPrice.findMany).toHaveBeenCalledWith({
        where: { product_id: 'prod1' },
        include: { priceList: true }, // Changed from select to include
      });
    });

    it('should return 400 if no price_list_id or product_id is provided', async () => {
      const req = new NextRequest('http://localhost/api/productprices');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Falta el ID del producto o de la lista de precios.');
    });
  });

  // --- POST Tests ---
  describe('POST /api/productprices', () => {
    it('should update/create product prices for a price list', async () => {
      const req = new NextRequest('http://localhost/api/productprices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_list_id: 'list1',
          prices: {
            'prod1': 10.0,
            'prod2': 20.0,
          },
        }),
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        await Promise.all(cb);
        return [];
      });
      (prisma.productPrice.upsert as jest.Mock).mockImplementation((args) => args);

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe('Precios actualizados correctamente.');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.productPrice.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.productPrice.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { product_id_price_list_id: { product_id: 'prod1', price_list_id: 'list1' } },
        create: { product_id: 'prod1', price_list_id: 'list1', price_usd: 10.0 },
      }));
      expect(prisma.productPrice.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { product_id_price_list_id: { product_id: 'prod2', price_list_id: 'list1' } },
        create: { product_id: 'prod2', price_list_id: 'list1', price_usd: 20.0 },
      }));
    });

    it('should return 400 if insufficient data is provided for POST', async () => {
      const req = new NextRequest('http://localhost/api/productprices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_list_id: 'list1' }), // Missing prices
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Datos insuficientes para guardar los precios.');
    });
  });

  // --- DELETE Tests ---
  describe('DELETE /api/productprices', () => {
    it('should delete a product price entry', async () => {
      const req = new NextRequest('http://localhost/api/productprices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_list_id: 'list1', product_id: 'prod1' }),
      });
      (prisma.productPrice.delete as jest.Mock).mockResolvedValue({});

      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe('Producto desenlazado correctamente.');
      expect(prisma.productPrice.delete).toHaveBeenCalledWith({
        where: {
          product_id_price_list_id: {
            product_id: 'prod1',
            price_list_id: 'list1',
          },
        },
      });
    });

    it('should return 400 if insufficient data is provided for DELETE', async () => {
      const req = new NextRequest('http://localhost/api/productprices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_list_id: 'list1' }), // Missing product_id
      });
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Faltan el ID del producto o de la lista de precios para desenlazar.');
    });
  });
});
