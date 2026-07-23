const fs = require('fs');
const path = require('path');

function searchDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        searchDirectory(fullPath);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('nodemailer') || content.includes('sendEmail') || content.includes('nodemailer')) {
          console.log(`Found in: ${fullPath}`);
          // Print lines containing the match
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (line.includes('nodemailer') || line.includes('sendEmail')) {
              console.log(`  Line ${index + 1}: ${line.trim()}`);
            }
          });
        }
      }
    }
  }
}

console.log('Searching in src/...');
searchDirectory(path.join(__dirname, '../src'));
console.log('Searching in scripts/...');
searchDirectory(__dirname);
