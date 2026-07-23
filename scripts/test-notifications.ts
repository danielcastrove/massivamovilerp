
import { sendPaymentConfirmation } from '../src/lib/notifications.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runTest() {
  console.log('--- Starting Notification Test ---');
  
  const testData = {
    toPhone: '584142768598', // Placeholder number seen in codebase
    toEmail: process.env.COPY_EMAIL || 'josef@hibot.tech',
    customerName: 'Cliente de Prueba (Gemini Test)',
    amount: '150.50',
    currency: 'USD',
    reference: 'TEST-12345'
  };

  console.log('Test Data:', testData);

  try {
    const results = await sendPaymentConfirmation(testData);
    console.log('Test completed.');
  } catch (error: any) {
    if (error.response) {
      console.error('Test failed with status:', error.response.status);
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Test failed with error:', error.message);
    }
  }
}

runTest();
