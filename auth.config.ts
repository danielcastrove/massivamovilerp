// massivamovilerp/auth.config.ts
import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    // We keep jwt and session callbacks here as they are generally Edge-compatible
    jwt({ token, user }) {
        if (user) {
          token.role = user.role;
          token.isActive = user.is_active;
        }
        return token;
    },
    session({ session, token }) {
        if (session.user) {
          session.user.id = token.id as string;
          session.user.role = token.role as string;
          session.user.isActive = token.isActive as boolean;
          session.user.roles_id = token.roles_id as string | null;
          session.user.modules = token.modules as any[] | undefined;
        }
        return session;
    },
  },
  providers: [], // Providers are not included in the Edge-compatible config
} satisfies NextAuthConfig;
