import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "El correo es requerido").email("Correo inválido"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
