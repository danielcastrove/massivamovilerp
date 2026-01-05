// massivamovilerp/src/lib/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcrypt-ts';
import { prisma } from './db';
import { authConfig } from '../../auth.config'; // Import the base config
import { PrismaAdapter } from "@auth/prisma-adapter";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) {
          return null;
        }

        if (!user.password_hash || user.password_hash.length < 10) {
          return null;
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password_hash
        ).catch(() => false);

        if (isPasswordValid) {
          return user;
        }

        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isActive = user.is_active;
        token.roles_id = user.roles_id;

        // Determine roleDisplayName
        let roleDisplayName: string;
        if (user.role === 'MASSIVA_ADMIN') {
          roleDisplayName = 'Administrador';
        } else if (user.role === 'CLIENTE') {
          roleDisplayName = 'Cliente';
        } else if (user.role === 'MASSIVA_EXTRA' && user.roles_id) {
          const extraRole = await prisma.role.findUnique({
            where: { id: user.roles_id },
            select: { name: true },
          });
          roleDisplayName = extraRole?.name || 'Extra';
        } else {
          roleDisplayName = user.role; // Default to raw role if not matched
        }
        token.roleDisplayName = roleDisplayName;

        // Fetch modules based on role
        let modules = [];
        if (user.role === 'MASSIVA_ADMIN') {
          modules = await prisma.modulo.findMany();
        } else if (user.role === 'MASSIVA_EXTRA' && user.roles_id) {
          const roleModules = await prisma.moduloToRole.findMany({
            where: { role_id: user.roles_id },
            include: { modulo: true },
          });
          modules = roleModules.map(rm => rm.modulo);
        } else if (user.role === 'CLIENTE') {
          modules = [{ id: 'client-portal', name: 'Portal de Cliente', path: '/client-portal' }];
        }
        token.modules = modules;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.isActive = token.isActive;
        session.user.modules = token.modules as any[];
        session.user.roles_id = token.roles_id as string | null;
        session.user.roleDisplayName = token.roleDisplayName as string; // Pass roleDisplayName to session
      }
      return session;
    },
  },
});