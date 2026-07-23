
import { sendWhatsAppMassiva } from "../src/lib/whatsapp.ts";
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function testWhatsApp() {
  console.log("--- Iniciando Prueba de WhatsApp ---");
  const testPhone = "+584265207594"; // Número de prueba del ejemplo
  const testMessage = "Prueba de envío WhatsApp desde MassivaMovil ERP - Notificación de Sistema";
  
  console.log(`Enviando a: ${testPhone}`);
  console.log(`Mensaje: ${testMessage}`);
  
  try {
    const result = await sendWhatsAppMassiva(testPhone, testMessage);
    console.log("Resultado de la API:", JSON.stringify(result, null, 2));
    
    if (result && result.status === 200) {
      console.log("✅ Prueba de WhatsApp completada exitosamente.");
    } else {
      console.log("⚠️ La API respondió pero el estatus no es 200. Verifique credenciales.");
    }
  } catch (error) {
    console.error("❌ Error durante la prueba de WhatsApp:", error);
  }
}

testWhatsApp();
