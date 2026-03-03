// massivamovilerp/src/components/customers/__tests__/CustomerFormModal.basic.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerFormModal } from '../CustomerFormModal';

const mockPriceLists = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Lista Base' }
];

const mockProducts = [
  { id: '22222222-2222-2222-2222-222222222222', name: 'SMS Masivo' }
];

const mockClientUsers = [
  { id: '33333333-3333-3333-3333-333333333333', email: 'user@client.com' }
];

// Mock the fetch function
global.fetch = jest.fn((url) => {
  if (url === '/api/pricelists') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockPriceLists),
    });
  }
  if (url === '/api/users/client-users') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockClientUsers),
    });
  }
  if (url.includes('/api/productprices')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([{ product: mockProducts[0] }]),
    });
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, message: 'Success' }),
  });
}) as jest.Mock;

describe('CustomerFormModal Basic Tests', () => {
  const mockOnClose = jest.fn();
  
  // Set longer timeout for all tests in this describe block
  jest.setTimeout(60000);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal when isOpen is true', () => {
    render(<CustomerFormModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Crear Nuevo Cliente')).toBeInTheDocument();
  });

  it('should navigate through steps and submit with basic data', async () => {
    // Increase timeout for this specific test
    jest.setTimeout(30000);
    const { container, getByText } = render(<CustomerFormModal isOpen={true} onClose={mockOnClose} onSuccess={jest.fn()} />);
    
    // Paso 0: Usuario (Just click Next)
    fireEvent.click(getByText('Siguiente'));

    // Paso 1: Datos Empresa
    await waitFor(() => expect(screen.getByText(/Paso 2 de 9: Datos Empresa/i)).toBeInTheDocument());
    
    await waitFor(() => {
        expect(screen.getByLabelText(/Razón Social/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Razón Social/i), { target: { value: 'Test Company' } });
    fireEvent.change(screen.getByPlaceholderText('123456789'), { target: { value: '123456789' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    
    // Target phone inputs specifically by placeholder
    const phoneInputs = screen.getAllByPlaceholderText('4120000000');
    fireEvent.change(phoneInputs[0], { target: { value: '4120000000' } });
    fireEvent.change(screen.getByLabelText(/Dirección Física/i), { target: { value: 'Direccion Fiscal 123' } });

    // Handle the Select for taxIdPrefix - In Radix/Shadcn, we sometimes have to find by role or text
    // For simplicity, let's assume 'V' is default or try to click it.
    // If validation fails, it's usually because a required field is missing.
    // taxIdPrefix is required.

    fireEvent.click(getByText('Siguiente'));

    // Paso 2: Detalles Empresa
    await waitFor(() => expect(screen.getByText(/Paso 3 de 9: Detalles Empresa/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Ciudad/i), { target: { value: 'Caracas' } });
    fireEvent.change(screen.getByLabelText(/Estado/i), { target: { value: 'Miranda' } });
    fireEvent.change(screen.getByLabelText(/País/i), { target: { value: 'Venezuela' } });
    fireEvent.change(screen.getByLabelText(/Código Postal/i), { target: { value: '1060' } });
    fireEvent.click(screen.getByText('Siguiente'));

    // Paso 3: Contacto
    await waitFor(() => expect(screen.getByText(/Paso 4 de 9: Contacto/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Nombre de Contacto/i), { target: { value: 'Contacto Test' } });
    fireEvent.change(screen.getByLabelText(/Email de Contacto/i), { target: { value: 'contacto@test.com' } });
    
    // Find contact phone input (it has a placeholder 02120000000)
    fireEvent.change(screen.getByPlaceholderText('02120000000'), { target: { value: '02120000000' } });
    
    fireEvent.change(screen.getByLabelText(/Cargo/i), { target: { value: 'Gerente' } });
    fireEvent.click(screen.getByText('Siguiente'));

    // Paso 4: Cobranza (Check Same as Contact)
    await waitFor(() => expect(screen.getByText(/Paso 5 de 9: Cobranza/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Los datos de cobranza son los mismos/i));
    fireEvent.click(screen.getByText('Siguiente'));

    // Paso 5: Documento Constitutivo
    await waitFor(() => expect(screen.getByText(/Paso 6 de 9: Documento Constitutivo/i)).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/Registro Mercantil/i), { target: { value: 'Registro Test' } });
    
    // Find the date input by label
    fireEvent.change(screen.getByLabelText(/Fecha de Registro/i), { target: { value: '2020-01-01' } });
    
    fireEvent.change(screen.getByPlaceholderText(/Nro 1, Tomo/i), { target: { value: 'Tomo 1' } });
    fireEvent.click(screen.getByText('Siguiente'));

    // Paso 6: Impuestos
    await waitFor(() => expect(screen.getByText(/Paso 7 de 9: Impuestos/i)).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/Dirección para facturación/i), { target: { value: 'Direccion Fiscal Final' } });
    fireEvent.click(screen.getByText('Siguiente'));

    // Paso 7: Rep. Legal
    await waitFor(() => expect(screen.getByText(/Paso 8 de 9: Rep. Legal/i)).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('Ana Gomez'), { target: { value: 'Rep Legal Test' } });
    fireEvent.change(screen.getByPlaceholderText('representante@example.com'), { target: { value: 'rep@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('12345678'), { target: { value: '87654321' } });
    
    // Find representative phone input by placeholder (it's the only one in this step)
    fireEvent.change(screen.getByPlaceholderText('4120000000'), { target: { value: '4120000000' } });
    
    // Fill cargo in Step 7
    fireEvent.change(screen.getByPlaceholderText('Director'), { target: { value: 'Director Test' } });
    
    fireEvent.click(screen.getByText('Siguiente'));

    // Paso 8: Suscripción
    await waitFor(() => expect(screen.getByText(/Paso 9 de 9: Suscripción/i)).toBeInTheDocument());
    
    // Select Price List
    fireEvent.click(screen.getByText('Seleccione una lista'));
    await waitFor(() => expect(screen.getAllByText('Lista Base').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('option', { name: 'Lista Base' }));

    // Wait for product selection to be enabled and then select it
    await waitFor(() => expect(screen.queryByText('Seleccione un producto')).not.toBeDisabled());
    fireEvent.click(screen.getByText('Seleccione un producto'));
    await waitFor(() => expect(screen.getAllByText('SMS Masivo').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('option', { name: 'SMS Masivo' }));

    // Submit
    fireEvent.click(screen.getByText('Guardar Cliente'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/customers',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"businessName":"Test Company"'),
        })
      );
    });
  });
});