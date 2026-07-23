const dns = require('dns');

const hosts = [
  'devapimail.bigmovil.com',
  'apimail.bigmovil.com',
  'mail.bigmovil.com',
  'devapimail.massivamovil.com',
  'apimail.massivamovil.com',
  'mail.massivamovil.com',
  'api.bigmovil.com',
  'api.massivamovil.com',
  'sistema.massivamovil.com'
];

console.log('Resolving hosts...');
hosts.forEach(host => {
  dns.resolve4(host, (err, addresses) => {
    if (err) {
      console.log(`❌ ${host}: Failed (${err.code})`);
    } else {
      console.log(`✅ ${host}: Resolved to ${addresses.join(', ')}`);
    }
  });
});
