// massivamovilerp/src/lib/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcrypt-ts';
import { prisma } from './db';
import { authConfig } from '../../auth.config'; // Import the base config
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Adapter } from "next-auth/adapters";
import { UserRole } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma) as Adapter,
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
      // This is the most important part.
      // On initial sign-in, the `user` object is passed.
      // We need to persist the data from the `user` object to the `token`.
      if (user) {
        token.id = user.id;
        token.user_role = user.role; // Use user_role to avoid conflicts and match RLS
        token.is_active = user.is_active;
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
          roleDisplayName = user.role;
        }
        token.roleDisplayName = roleDisplayName;

        // Fetch modules based on role
        interface ModuleToken {
          id: string;
          name: string;
          path: string;
        }
        let modules: ModuleToken[] = [];
        if (user.role === 'MASSIVA_ADMIN') {
          const fetchedModules = await prisma.modulo.findMany();
          modules = fetchedModules.map(m => ({
            id: m.id,
            name: m.name,
            path: m.path || '', // Ensure path is a string
          }));
        } else if (user.role === 'MASSIVA_EXTRA' && user.roles_id) {
          const roleModules = await prisma.moduloToRole.findMany({
            where: { role_id: user.roles_id },
            include: { modulo: true },
          });
          modules = roleModules.map(rm => ({
            id: rm.modulo.id,
            name: rm.modulo.name,
            path: rm.modulo.path || '', // Ensure path is a string
          }));
        } else if (user.role === 'CLIENTE') {
          // Define specific modules for CLIENTE role
          modules = [{ id: 'client-portal', name: 'Portal de Cliente', path: '/client-portal' }];
        }
        token.modules = modules;
      }
      return token;
    },
    async session({ session, token }) {
      // The session callback receives the token from the jwt callback.
      // We transfer the data from the token to the session object.
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.user_role as UserRole; // Read from token.user_role
        session.user.is_active = token.is_active as boolean;
        session.user.modules = token.modules as any[];
        session.user.roles_id = token.roles_id as string | null;
        session.user.roleDisplayName = token.roleDisplayName as string;
      }
      return session;
    },
  },
});