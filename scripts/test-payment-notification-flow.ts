
import { prisma } from "../src/lib/db.ts";
import { sendPaymentConfirmation } from "../src/lib/notifications.ts";
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function testFullPaymentFlow() {
  console.log("🚀 Iniciando prueba de flujo completo de notificaciones de pago...");

  try {
    // 1. Buscar un cliente de prueba
    const customer = await prisma.customer.findFirst({
        where: { status: 'ACTIVE' },
        select: {
            id: true,
            name: true,
            email: true,
            telefono_empresa: true,
            persona_cobranza_info: true,
        }
    });

    if (!customer) {
        console.error("❌ No se encontró ningún cliente activo para la prueba.");
        return;
    }

    console.log(`👤 Cliente seleccionado: ${customer.name}`);
    
    const contactPhone = (customer.persona_cobranza_info as any)?.telefono || customer.telefono_empresa;
    const contactEmail = (customer.persona_cobranza_info as any)?.email || customer.email;

    console.log(`📱 Teléfono destino: ${contactPhone}`);
    console.log(`📧 Email destino: ${contactEmail}`);

    // 2. Simular los datos del pago
    const paymentData = {
        amount: 10.50,
        currency: "USD",
        reference: "TEST-FLOW-001"
    };

    console.log("⏳ Disparando notificaciones (esperando ejecución)...");

    // Forzamos la espera del Promise.all para ver el resultado real en el script
    const results = await sendPaymentConfirmation({
        toPhone: contactPhone,
        toEmail: contactEmail,
        customerName: customer.name,
        amount: paymentData.amount,
        currency: paymentData.currency,
        reference: paymentData.reference
    });

    console.log("✅ Flujo de notificaciones ejecutado.");
    console.log("Resultados:", JSON.stringify(results, null, 2));

  } catch (error) {
    console.error("🚨 Error crítico en la prueba de flujo:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testFullPaymentFlow();
