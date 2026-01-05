// massivamovilerp/src/components/auth/__tests__/login-form.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginForm from '../login-form';
import { useAuth } from '../../../contexts/UserContext'; // Import useAuth

// Mock the useAuth hook
jest.mock('../../../contexts/UserContext', () => ({
  useAuth: jest.fn(),
}));

// Mock the useRouter hook from next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
}));

describe('LoginForm', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    // Reset the mock before each test
    mockLogin.mockReset();
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      isLoading: false,
    });
  });

  it('renders the login form', () => {
    render(<LoginForm />);

    expect(screen.getByRole('heading', { name: /Accede a tu cuenta/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Login/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar Sesión/i })).toBeInTheDocument();
  });

  it('shows validation errors for invalid email and short password', async () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/Login/i), { target: { value: 'invalid-email' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/i }));

    await waitFor(() => {
      expect(screen.getByText(/El email no es válido./i)).toBeInTheDocument();
      expect(screen.getByText(/La contraseña debe tener al menos 6 caracteres./i)).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login with correct credentials on success', async () => {
    mockLogin.mockResolvedValue({ success: true });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/Login/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('displays an error message for invalid credentials', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'Credenciales inválidas. Por favor, inténtalo de nuevo.' });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/Login/i), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/i }));

    await waitFor(() => {
      expect(screen.getByText(/Credenciales inválidas. Por favor, inténtalo de nuevo./i)).toBeInTheDocument();
      expect(mockLogin).toHaveBeenCalledWith('wrong@example.com', 'wrongpass');
    });
  });

  // Test for "Forgot Password" link
  it('displays a link to the forgot password page', () => {
    render(<LoginForm />);
    
    const forgotPasswordLink = screen.getByRole('link', { name: /¿Olvidaste tu contraseña\?/i });
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink).toHaveAttribute('href', '/auth/forgot-password'); 
  });
});