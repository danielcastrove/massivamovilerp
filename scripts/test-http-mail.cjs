const axios = require('axios');
const https = require('https');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testHttpMail() {
  console.log('--- Testing HTTP Mail API ---');
  
  const emailApiUrl = 'https://devapimail.bigmovil.com/sendMail';
  const emailApiBearerToken = process.env.EMAIL_API_TOKEN;
  const apiAuthToken = process.env.EMAIL_API_AUTH_TOKEN;
  const apiPasswordEncrypted = process.env.EMAIL_API_PASSWD_ENCRYPTED;
  const hostServer = process.env.EMAIL_SERVER_HOST;
  const portServer = parseInt(process.env.EMAIL_SERVER_PORT || '465');
  const emailUserServer = process.env.EMAIL_SERVER_USER;
  const passwordEmailUserServer = process.env.EMAIL_SERVER_PASSWORD;
  const emailSendMail = process.env.EMAIL_FROM_ADDRESS || 'monitoreo@massivamovil.com';

  const payload = {
    token_api: apiAuthToken,
    passwdor_encryted_api: apiPasswordEncrypted,
    name_contact: 'Notificación del Sistema (Test)',
    email_contact: emailSendMail,
    phone_contact: '04142768598',
    subject_page: "MassivaMovil ERP: ",
    subject_contact: 'Test HTTP Mail API',
    message_contact: 'Test message',
    host_server: hostServer,
    port_server: portServer,
    email_user_server: emailUserServer,
    password_email_user_server: passwordEmailUserServer,
    name_sendMail: 'Monitoreo MassivaMovil',
    email_sendMail: emailSendMail,
    name_receiver: 'Test Receiver',
    email_receiver: 'test-erp-massiva@yopmail.com',
    email_copy: '',
    email_copy_2: '',
    email_copy_hidden: '',
    email_copy_hidden_2: '',
    body_html: '<p>Test html</p>',
  };

  const agent = new https.Agent({  
    rejectUnauthorized: false
  });

  try {
    const response = await axios.post(emailApiUrl, payload, {
      headers: {
        'Accept': 'application/json',
        "Content-Type": "application/json",
        "authorization": `bearer ${emailApiBearerToken}`
      },
      httpsAgent: agent
    });
    console.log('✅ Response:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testHttpMail();
