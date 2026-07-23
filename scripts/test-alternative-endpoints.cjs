const axios = require('axios');
const https = require('https');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const urls = [
  'https://api.massivamovil.com/sendMail',
  'https://sistema.massivamovil.com/sendMail',
  'https://mail.massivamovil.com/sendMail',
  'https://api.bigmovil.com/sendMail',
  'https://apimail.bigmovil.com/sendMail'
];

async function testEndpoints() {
  const agent = new https.Agent({ rejectUnauthorized: false });
  const emailApiBearerToken = process.env.EMAIL_API_TOKEN;

  for (const url of urls) {
    console.log(`Testing URL: ${url}`);
    try {
      // Send a dummy post request just to check if it's there
      const response = await axios.post(url, {}, {
        headers: {
          'Accept': 'application/json',
          "Content-Type": "application/json",
          "authorization": `bearer ${emailApiBearerToken}`
        },
        httpsAgent: agent,
        timeout: 5000
      });
      console.log(`  🟢 Response from ${url}: Status ${response.status}`);
    } catch (error) {
      if (error.response) {
        console.log(`  🟡 Response from ${url}: Status ${error.response.status}`);
      } else {
        console.log(`  ❌ Error from ${url}: ${error.message}`);
      }
    }
  }
}

testEndpoints();
