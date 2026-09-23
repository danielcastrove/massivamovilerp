import * as z from "zod";
import { UserRole } from "@prisma/client";

export const createUserSchema = z.object({
  email: z.string().email("Correo inválido").min(1, "Correo requerido"),
  nombre: z.string().min(1, "Nombre requerido"),
  apellido: z.string().optional().or(z.literal("")),
  telefono_celular: z.string().optional().or(z.literal("")),
  cargo: z.string().optional().or(z.literal("")),
  role: z.nativeEnum(UserRole),
  is_active: z.boolean().default(true),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).default("ACTIVE"),
  modules: z.array(z.string()).default([]),
  customerId: z.string().optional().nullable(),
  resetPassword: z.string().optional().or(z.literal("")),
  rol_name: z.string().optional().nullable(),
});

export const updateUserSchema = createUserSchema.partial().extend({
  email: z.string().email("Correo inválido").optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;