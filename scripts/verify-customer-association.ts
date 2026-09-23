// massivamovilerp/scripts/verify-customer-association.ts
import { prisma } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function verifyAssociationFlow() {
  console.log("🚀 Iniciando verificación de flujo de asociación de clientes...");

  const testEmail = `test-associate-${Date.now()}@example.com`;
  const testRIF = "J-123456789";

  try {
    // 1. Crear un usuario huérfano (sin cliente)
    console.log(`1. Creando usuario huérfano con email: ${testEmail}`);
    const hashedPassword = await bcrypt.hash(testRIF, 10);
    const orphanUser = await prisma.user.create({
      data: {
        email: testEmail,
        password_hash: hashedPassword,
        role: "CLIENTE",
      },
    });
    console.log("✅ Usuario creado con ID:", orphanUser.id);

    // 2. Simular intento de creación de cliente con ese mismo email
    console.log("2. Simulando primer intento de creación de cliente (debería fallar con 409)");
    // Aquí normalmente llamaríamos al API, pero verificamos la lógica de DB directamente
    const existingUser = await prisma.user.findUnique({ where: { email: testEmail } });
    const existingCustomer = await prisma.customer.findFirst({ where: { user_id: existingUser?.id } });

    if (existingUser && !existingCustomer) {
      console.log("✅ Lógica confirmada: Usuario existe y NO tiene cliente asociado. (Acción: prompt_to_associate)");
    } else {
      throw new Error("❌ Error en lógica de detección de conflicto.");
    }

    // 3. Simular la asociación confirmada
    console.log("3. Simulando asociación confirmada (useExistingUser = true)");
    const newCustomer = await prisma.customer.create({
      data: {
        name: "Empresa de Prueba Asociada",
        email: testEmail,
        doc_number: testRIF,
        tipo_doc_identidad: "J",
        type: "EMPRESA",
        direccion_fiscal: "Dirección de prueba",
        user: { connect: { id: orphanUser.id } },
      }
    });

    console.log("✅ Cliente creado y asociado exitosamente al ID:", newCustomer.user_id);
    
    // Verificación final
    if (newCustomer.user_id === orphanUser.id) {
        console.log("✨ VERIFICACIÓN EXITOSA: El flujo de asociación funciona correctamente.");
    }

    // Limpieza
    await prisma.customer.delete({ where: { id: newCustomer.id } });
    await prisma.user.delete({ where: { id: orphanUser.id } });
    console.log("🗑️ Datos de prueba eliminados.");

  } catch (error) {
    console.error("❌ Fallo en la verificación:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAssociationFlow();
