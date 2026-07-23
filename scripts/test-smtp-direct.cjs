const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testDirectSMTP() {
  console.log('--- Testing Direct SMTP Email Sending ---');
  
  const host = process.env.EMAIL_SERVER_HOST;
  const port = parseInt(process.env.EMAIL_SERVER_PORT || '465');
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;
  const from = process.env.EMAIL_FROM_ADDRESS || 'info@massivamovil.com';

  console.log('SMTP Config:', { host, port, user, from });

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user: user,
      pass: pass,
    },
    tls: {
      // Do not fail on invalid certs (similar to rejectUnauthorized: false)
      rejectUnauthorized: false
    }
  });

  try {
    const info = await transporter.sendMail({
      from: `"Monitoreo MassivaMovil" <${from}>`,
      to: 'test-erp-massiva@yopmail.com',
      subject: 'PRUEBA DIRECTA SMTP - MassivaMovil ERP',
      html: '<p>Este es un correo de prueba enviado directamente usando SMTP (Nodemailer).</p>'
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Error sending email via SMTP:', error);
  }
}

testDirectSMTP();
