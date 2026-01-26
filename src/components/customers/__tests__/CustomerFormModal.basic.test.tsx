// massivamovilerp/src/components/customers/__tests__/CustomerFormModal.basic.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerFormModal } from '../CustomerFormModal';

// Mock the fetch function
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  })
) as jest.Mock;

describe('CustomerFormModal Basic Tests', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal when isOpen is true', () => {
    render(<CustomerFormModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Crear Nuevo Cliente')).toBeInTheDocument();
  });

  it('should submit the form with basic data', async () => {
    render(<CustomerFormModal isOpen={true} onClose={mockOnClose} />);
    
    // Go to step 1
    fireEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
        expect(screen.getByText('Paso 1 de 8: Datos de la Empresa')).toBeInTheDocument();
    });
    
    // Fill in some basic data
    fireEvent.change(screen.getByLabelText('Razón Social'), { target: { value: 'Test Company' } });
    fireEvent.change(screen.getByLabelText('RIF / Cédula'), { target: { value: 'J-123456789' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Teléfono Principal'), { target: { value: '4120000000' } });

    // Navigate to the last step
    for (let i = 1; i < 8; i++) {
        fireEvent.click(screen.getByText('Siguiente'));
    }

    await waitFor(() => {
        expect(screen.getByText('Paso 8 de 8: Suscripción Inicial')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Guardar Cliente'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/customers',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"name":"Test Company"'),
        })
      );
    });
  });
});
