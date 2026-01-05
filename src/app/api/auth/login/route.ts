// massivamovilerp/src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    // console.log('[API Login] llego a login route'); // Log request received
    const body = await req.json();
    // console.log('[API Login] Request Body:', body); // Log request body
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      // console.log('[API Login] Validation failed:', validation.error);
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { email, password } = validation.data;

    // Use the signIn function from NextAuth.js on the server-side
    const result = await signIn('credentials', {
      redirect: false, // Important: Don't redirect on the API route
      email,
      password,
    });
    
    // console.log('[API Login] signIn result:', result); // Log signIn result

    // The `signIn` function in the 'credentials' provider will handle
    // the database check and password verification securely.

    if (result?.error) {
      // The error here comes from the `authorize` function in `src/lib/auth.ts`
      // It will be "Invalid credentials" or similar.
      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
    }
    
    // If signIn is successful, it returns a non-error response.
    // We can signal success to the client.
    return NextResponse.json({ success: true, message: 'Inicio de sesión exitoso.' }, { status: 200 });

  } catch (error) {
    // console.error('[LOGIN_API_ERROR]', error);
    return NextResponse.json({ error: 'Ocurrió un error en el servidor.' }, { status: 500 });
  }
}
