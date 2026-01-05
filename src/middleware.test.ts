import { middleware } from './middleware';
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';

// Mock NextAuth
let mockedAuth: jest.Mock;
jest.mock('next-auth', () => {
  mockedAuth = jest.fn();
  const NextAuthMock = jest.fn((config) => {
    return { auth: mockedAuth };
  });
  return {
    __esModule: true,
    default: NextAuthMock,
  };
});

// Mock NextResponse
jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  NextResponse: {
    ...jest.requireActual('next/server').NextResponse,
    redirect: jest.fn().mockImplementation((url) => ({
      status: 307,
      headers: { location: url.toString() },
    })),
    next: jest.fn().mockImplementation(() => ({
      status: 200,
    })),
  },
}));

const mockedRedirect = NextResponse.redirect as jest.Mock;
const mockedNext = NextResponse.next as jest.Mock;

describe('Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect to /auth/login if user is not logged in and tries to access /dashboard', async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/dashboard');
    const result = await middleware(req);

    expect(mockedRedirect).toHaveBeenCalledWith(new URL('/auth/login', req.url));
    expect(result.status).toBe(307);
  });

  it('should redirect to /dashboard if user is logged in and tries to access /auth/login', async () => {
    mockedAuth.mockResolvedValue({ user: { id: '1', role: 'MASSIVA_ADMIN' } });
    const req = new NextRequest('http://localhost:3000/auth/login');
    const result = await middleware(req);

    expect(mockedRedirect).toHaveBeenCalledWith(new URL('/dashboard', req.url));
    expect(result.status).toBe(307);
  });

  it('should redirect to /dashboard if user is logged in and tries to access /', async () => {
    mockedAuth.mockResolvedValue({ user: { id: '1', role: 'MASSIVA_ADMIN' } });
    const req = new NextRequest('http://localhost:3000/');
    const result = await middleware(req);

    expect(mockedRedirect).toHaveBeenCalledWith(new URL('/dashboard', req.url));
    expect(result.status).toBe(307);
  });

  it('should redirect to /auth/login if user is not logged in and tries to access /', async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/');
    const result = await middleware(req);

    expect(mockedRedirect).toHaveBeenCalledWith(new URL('/auth/login', req.url));
    expect(result.status).toBe(307);
  });

  it('should allow access to unprotected routes for logged in users', async () => {
    mockedAuth.mockResolvedValue({ user: { id: '1', role: 'MASSIVA_ADMIN' } });
    const req = new NextRequest('http://localhost:3000/some/unprotected/route');
    const result = await middleware(req);

    expect(mockedNext).toHaveBeenCalled();
    expect(mockedRedirect).not.toHaveBeenCalled();
    expect(result.status).toBe(200);
  });

  it('should allow access to unprotected routes for non-logged in users', async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/some/unprotected/route');
    const result = await middleware(req);
    
    expect(mockedNext).toHaveBeenCalled();
    expect(mockedRedirect).not.toHaveBeenCalled();
    expect(result.status).toBe(200);
  });
});
