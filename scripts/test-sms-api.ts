
import { sendSmsMassiva } from "../src/lib/sms.ts";
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function testSms() {
  console.log("--- Iniciando Prueba de SMS ---");
  const testPhone = "584265207594"; // Número de prueba del ejemplo
  const testMessage = "Prueba de envío SMS desde MassivaMovil ERP - ¡Hola Mundo!";
  
  console.log(`Enviando a: ${testPhone}`);
  console.log(`Mensaje original: ${testMessage}`);
  
  try {
    const result = await sendSmsMassiva(testPhone, testMessage);
    console.log("Resultado de la API:", JSON.stringify(result, null, 2));
    
    if (result && result.status && Number(result.status) > 0) {
      console.log("✅ Prueba de SMS completada exitosamente.");
    } else {
      console.log("⚠️ La API respondió pero el estatus no es positivo. Verifique credenciales.");
    }
  } catch (error) {
    console.error("❌ Error durante la prueba de SMS:", error);
  }
}

testSms();
