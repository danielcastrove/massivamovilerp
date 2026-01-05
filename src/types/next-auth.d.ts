// massivamovilerp/src/types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import { UserRole } from "@prisma/client"; // Adjust path as necessary

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      isActive: boolean;
      modules: any[];
      roles_id?: string | null; // Add roles_id to the session user
      roleDisplayName: string; // Add roleDisplayName
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
    is_active: boolean;
    roles_id?: string | null; // Corrected property name and type
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    isActive: boolean;
    modules: any[];
    roles_id?: string | null; // Add roles_id to the JWT
    roleDisplayName: string; // Add roleDisplayName
  }
}
