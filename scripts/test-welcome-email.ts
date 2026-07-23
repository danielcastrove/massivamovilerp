
import * as dotenv from 'dotenv';
import { sendEmail } from '../src/lib/email.js';

dotenv.config();

async function testEmail() {
  console.log('--- Iniciando Prueba de Envío de Correo ---');
  
  const testEmail = 'test-erp-massiva@yopmail.com'; // Email de prueba temporal
  const testPassword = 'PruebaPassword123!';
  const testName = 'Usuario de Prueba';
  const testCustomer = 'Empresa Test S.A.';

  const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #6d28d9; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Bienvenido a MassivaMovil ERP (TEST)</h1>
          </div>
          <div style="padding: 30px; line-height: 1.6;">
              <p>Hola <strong>${testName}</strong>,</p>
              <p>Esto es una prueba de envío de credenciales para la empresa <strong>${testCustomer}</strong>.</p>
              
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #6d28d9; margin: 20px 0;">
                  <p style="margin-top: 0;"><strong>Sus credenciales de acceso:</strong></p>
                  <p style="margin-bottom: 5px;"><strong>Usuario:</strong> ${testEmail}</p>
                  <p style="margin-bottom: 10px;"><strong>Contraseña Temporal:</strong> <span style="font-family: monospace; background: #eee; padding: 2px 5px; border-radius: 3px;">${testPassword}</span></p>
              </div>

              <p>Si recibe este correo, la configuración de Email API es correcta.</p>
              <p>Saludos,<br>El equipo de MassivaMovil.com</p>
          </div>
      </div>
  `;

  try {
    console.log(`Enviando correo a ${testEmail}...`);
    const result = await sendEmail({
      to: testEmail,
      subject: 'PRUEBA: Credenciales de acceso - MassivaMovil ERP',
      html: htmlContent
    });
    console.log('Resultado:', result);
    console.log('✅ PRUEBA EXITOSA');
  } catch (error) {
    console.error('❌ ERROR EN LA PRUEBA:');
    console.error(error);
  }
}

testEmail();
