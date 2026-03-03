// massivamovilerp/src/components/customers/__tests__/CustomerFormModal.conflict.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerFormModal } from '../CustomerFormModal';

const mockPriceLists = [{ id: '11111111-1111-1111-1111-111111111111', name: 'Lista Base' }];
const mockProducts = [{ id: '22222222-2222-2222-2222-222222222222', name: 'SMS Masivo' }];
const mockClientUsers = [{ id: '33333333-3333-3333-3333-333333333333', email: 'user@client.com' }];

// Mock the fetch function
global.fetch = jest.fn() as jest.Mock;

describe('CustomerFormModal Conflict & Association Tests', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (url === '/api/pricelists') return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPriceLists) });
      if (url === '/api/users/client-users') return Promise.resolve({ ok: true, json: () => Promise.resolve(mockClientUsers) });
      if (url.includes('/api/productprices')) return Promise.resolve({ ok: true, json: () => Promise.resolve([{ product: mockProducts[0] }]) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
    });
  });

  const navigateToLastStep = async () => {
    // Paso 0: Usuario
    fireEvent.click(screen.getByText('Siguiente'));

    // Paso 1: Datos Empresa
    await waitFor(() => expect(screen.getByText(/Paso 2 de 9: Datos Empresa/i)).toBeInTheDocument(), { timeout: 10000 });
    fireEvent.change(screen.getByLabelText(/Razón Social/i), { target: { value: 'Conflict Corp' } });
    fireEvent.change(screen.getByPlaceholderText('123456789'), { target: { value: '123456789' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'conflict@example.com' } });
    fireEvent.change(screen.getAllByPlaceholderText('4120000000')[0], { target: { value: '4120000000' } });
    fireEvent.change(screen.getByLabelText(/Dirección Física/i), { target: { value: 'Address 123' } });
    fireEvent.click(screen.getByText('Siguiente'));

    // Paso 2: Detalles Empresa
    await waitFor(() => expect(screen.getByText(/Paso 3 de 9: Detalles Empresa/i)).toBeInTheDocument(), { timeout: 10000 });
    fireEvent.change(screen.getByLabelText(/Ciudad/i), { target: { value: 'Caracas' } });
    fireEvent.change(screen.getByLabelText(/Estado/i), { target: { value: 'Miranda' } });
    fireEvent.change(screen.getByLabelText(/País/i), { target: { value: 'Venezuela' } });
    fireEvent.change(screen.getByLabelText(/Código Postal/i), { target: { value: '1060' } });
    fireEvent.click(screen.getByText('Siguiente'));

    // Paso 3: Contacto
    await waitFor(() => expect(screen.getByText(/Paso 4 de 9: Contacto/i)).toBeInTheDocument(), { timeout: 10000 });
    fireEvent.change(screen.getByLabelText(/Nombre de Contacto/i), { target: { value: 'Contact' } });
    fireEvent.change(screen.getByLabelText(/Email de Contacto/i), { target: { value: 'contact@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('02120000000'), { target: { value: '02120000000' } });
    fireEvent.change(screen.getByLabelText(/Cargo/i), { target: { value: 'Manager' } });
    fireEvent.click(screen.getByText('Siguiente'));

    // Paso 4: Cobranza
    await waitFor(() => expect(screen.getByText(/Paso 5 de 9: Cobranza/i)).toBeInTheDocument(), { timeout: 10000 });
    fireEvent.click(screen.getByText(/Los datos de cobranza son los mismos/i));
    fireEvent.click(screen.getByText('Siguiente'));

    // Paso 5: Documento Constitutivo
    await waitFor(() => expect(screen.getByText(/Paso 6 de 9: Documento Constitutivo/i)).toBeInTheDocument(), { timeout: 10000 });
    fireEvent.change(screen.getByPlaceholderText(/Registro Mercantil/i), { target: { value: 'Reg' } });
    fireEvent.change(screen.getByLabelText(/Fecha de Registro/i), { target: { value: '2020-01-01' } });
    fireEvent.change(screen.getByPlaceholderText(/Nro 1, Tomo/i), { target: { value: 'T1' } });
    fireEvent.click(screen.getByText('Siguiente'));

    // Paso 6: Impuestos
    await waitFor(() => expect(screen.getByText(/Paso 7 de 9: Impuestos/i)).toBeInTheDocument(), { timeout: 10000 });
    fireEvent.change(screen.getByPlaceholderText(/Dirección para facturación/i), { target: { value: 'Fiscal' } });
    fireEvent.click(screen.getByText('Siguiente'));

    // Paso 7: Rep. Legal
    await waitFor(() => expect(screen.getByText(/Paso 8 de 9: Rep. Legal/i)).toBeInTheDocument(), { timeout: 10000 });
    fireEvent.change(screen.getByPlaceholderText('Ana Gomez'), { target: { value: 'Rep' } });
    fireEvent.change(screen.getByPlaceholderText('representante@example.com'), { target: { value: 'rep@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('12345678'), { target: { value: '123' } });
    fireEvent.change(screen.getByPlaceholderText('4120000000'), { target: { value: '4120000000' } });
    fireEvent.change(screen.getByPlaceholderText('Director'), { target: { value: 'Dir' } });
    fireEvent.click(screen.getByText('Siguiente'));

    // Paso 8: Suscripción
    await waitFor(() => expect(screen.getByText(/Paso 9 de 9: Suscripción/i)).toBeInTheDocument(), { timeout: 10000 });
    
    // Select Price List
    fireEvent.click(screen.getByText('Seleccione una lista'));
    await waitFor(() => expect(screen.getAllByText('Lista Base').length).toBeGreaterThan(0), { timeout: 10000 });
    fireEvent.click(screen.getByRole('option', { name: 'Lista Base' }));

    // Select Product
    await waitFor(() => expect(screen.queryByText('Seleccione un producto')).not.toBeDisabled(), { timeout: 10000 });
    fireEvent.click(screen.getByText('Seleccione un producto'));
    await waitFor(() => expect(screen.getAllByText('SMS Masivo').length).toBeGreaterThan(0), { timeout: 10000 });
    fireEvent.click(screen.getByRole('option', { name: 'SMS Masivo' }));
  };

  it('should show the conflict step when the server returns 409 prompt_to_associate', async () => {
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (url === '/api/pricelists') return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPriceLists) });
      if (url === '/api/users/client-users') return Promise.resolve({ ok: true, json: () => Promise.resolve(mockClientUsers) });
      if (url.includes('/api/productprices')) return Promise.resolve({ ok: true, json: () => Promise.resolve([{ product: mockProducts[0] }]) });
      
      if (options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: () => Promise.resolve({
            message: 'Ya existe un usuario con este email. ¿Desea asociar este cliente al usuario existente?',
            existingUserId: 'existing-user-uuid',
            action: 'prompt_to_associate'
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<CustomerFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    await navigateToLastStep();
    
    // Submit
    fireEvent.click(screen.getByText('Guardar Cliente'));

    // Check if the conflict UI appears
    await waitFor(() => {
      expect(screen.getByText('Usuario Existente Detectado')).toBeInTheDocument();
      expect(screen.getByText(/Ya existe un usuario con este email/i)).toBeInTheDocument();
      expect(screen.getByText('Continuar y Asociar')).toBeInTheDocument();
      expect(screen.getByText('Descartar y Limpiar')).toBeInTheDocument();
    }, { timeout: 20000 });
  }, 60000);

  it('should reset the form and close when clicking Descartar y Limpiar', async () => {
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
        if (url === '/api/pricelists') return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPriceLists) });
        if (url === '/api/users/client-users') return Promise.resolve({ ok: true, json: () => Promise.resolve(mockClientUsers) });
        if (url.includes('/api/productprices')) return Promise.resolve({ ok: true, json: () => Promise.resolve([{ product: mockProducts[0] }]) });
        if (options?.method === 'POST') {
            return Promise.resolve({
                ok: false,
                status: 409,
                json: () => Promise.resolve({ action: 'prompt_to_associate', message: 'Conflict', existingUserId: '123' }),
            });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<CustomerFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    await navigateToLastStep();
    fireEvent.click(screen.getByText('Guardar Cliente'));

    await waitFor(() => expect(screen.getByText('Descartar y Limpiar')).toBeInTheDocument(), { timeout: 20000 });
    
    fireEvent.click(screen.getByText('Descartar y Limpiar'));
    
    expect(mockOnClose).toHaveBeenCalled();
  }, 60000);
});
