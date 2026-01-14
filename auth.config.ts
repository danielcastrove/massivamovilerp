// massivamovilerp/auth.config.ts
import type { NextAuthConfig } from 'next-auth';
import { UserRole } from '@prisma/client';

export const authConfig = {
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    // These callbacks are Edge-compatible and run in the middleware.
    // They are responsible for READING the data that the main `auth.ts` file WROTE to the JWT.
    jwt({ token, user }) {
      // The `user` object is only available on the initial sign-in, which is handled
      // by the main `auth.ts` in the Node.js environment. In the middleware (Edge),
      // we just need to pass the token along.
      if (user) {
        token.user_role = user.role;
        token.is_active = user.is_active;
        token.roles_id = user.roles_id;

      }
      return token;
    },
    session({ session, token }) {
      // This is the crucial part for the middleware.
      // We take the data from the rich token and put it into the session object.
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.user_role as UserRole;
        session.user.is_active = token.is_active as boolean;
        session.user.modules = (token.modules || []) as any[];
        session.user.roles_id = token.roles_id as string | null;
        session.user.roleDisplayName = token.roleDisplayName as string;

      }
      return session;
    },
  },
  providers: [], // Providers are not included in the Edge-compatible config
} satisfies NextAuthConfig;
