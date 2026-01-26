
import axios from 'axios';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

// Esta función configurará y enviará el correo electrónico utilizando el API externo.
export async function sendEmail({ to, subject, html }: MailOptions) {
  const emailApiUrl = process.env.EMAIL_API_URL || 'https://devapimail.bigmovil.com/sendMail';
  const emailApiBearerToken = process.env.EMAIL_API_TOKEN; // Token para el header 'authorization'

  const apiAuthToken = process.env.EMAIL_API_AUTH_TOKEN; // 'token_api' en el body
  const apiPasswordEncrypted = process.env.EMAIL_API_PASSWD_ENCRYPTED; // 'passwdor_encryted_api' en el body
  const hostServer = process.env.EMAIL_SERVER_HOST;
  const portServer = process.env.EMAIL_SERVER_PORT ? parseInt(process.env.EMAIL_SERVER_PORT) : undefined;
  const emailUserServer = process.env.EMAIL_SERVER_USER;
  const passwordEmailUserServer = process.env.EMAIL_SERVER_PASSWORD;
  const nameSendMail = 'Monitoreo MassivaMovil.com';
  const emailSendMail = process.env.EMAIL_FROM_ADDRESS || 'erp@massivamovil.com';
  const copyEmail = process.env.COPY_EMAIL;

  // Validaciones de variables de entorno
  if (!emailApiBearerToken) {
    throw new Error('EMAIL_API_TOKEN no está configurado en las variables de entorno para el header bearer.');
  }
  if (!apiAuthToken) {
    throw new Error('EMAIL_API_AUTH_TOKEN no está configurado en las variables de entorno para el body.');
  }
  if (!apiPasswordEncrypted) {
    throw new Error('EMAIL_API_PASSWD_ENCRYPTED no está configurado en las variables de entorno.');
  }
  if (!hostServer || !portServer || !emailUserServer || !passwordEmailUserServer) {
    throw new Error('Las variables de entorno EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD deben estar configuradas.');
  }
  if (isNaN(portServer)) {
    throw new Error('EMAIL_SERVER_PORT debe ser un número válido.');
  }


  try {
    const payload = {
      token_api: apiAuthToken,
      passwdor_encryted_api: apiPasswordEncrypted,
      name_contact: 'Notificación del Sistema', // Placeholder, se podría hacer dinámico si es necesario
      email_contact: emailSendMail, // Asumiendo que email_contact es el remitente
      phone_contact: '04142768598', // No necesario para este caso
      subject_page: "MassivaMovil ERP: ", // Prefijo para el asunto
      subject_contact: subject,
      message_contact: 'Este correo es generado automáticamente por MassivaMovil ERP.', // Mensaje genérico
      host_server: hostServer,
      port_server: portServer,
      email_user_server: emailUserServer,
      password_email_user_server: passwordEmailUserServer,
      name_sendMail: nameSendMail,
      email_sendMail: emailSendMail,
      name_receiver: 'Administrador ERP', // Placeholder, se podría hacer dinámico
      email_receiver: to,
      email_copy: copyEmail || '',
      email_copy_2: '',
      email_copy_hidden: '',
      email_copy_hidden_2: '',
      body_html: html,
    };

    const response = await axios.post(emailApiUrl, payload, {
      headers: {
        'Accept': 'application/json',
        "Content-Type": "application/json",
        "authorization": `bearer ${emailApiBearerToken}`
      },
    });

    console.log('Correo enviado exitosamente a través del API externo:', response.data);
    return `Email sent successfully to ${to}. API Response: ${JSON.stringify(response.data)}`;
  } catch (error) {
    console.error('Error al enviar correo a través del API externo:', error);
    if (axios.isAxiosError(error)) {
      console.error('Detalles del error de Axios:', error.response?.data);
      throw new Error(`Failed to send email: ${error.message}. API response: ${JSON.stringify(error.response?.data)}`);
    }
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


