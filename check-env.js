import fs from 'fs';

console.log('🔍 Checking .env file for hidden spaces...\n');

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');

lines.forEach((line, index) => {
  if (line.trim() === '') return;

  const parts = line.split('=');
  if (parts.length !== 2) return;

  const key = parts[0];
  const value = parts[1];

  console.log(`Line ${index + 1}: ${key}`);
  console.log(`  Value: "${value}"`);
  console.log(`  Length: ${value.length}`);

  if (value !== value.trim()) {
    console.log(`  ⚠️  WARNING: Extra spaces detected!`);
    console.log(`  Starts with space: ${value[0] === ' '}`);
    console.log(`  Ends with space: ${value[value.length - 1] === ' '}`);
  } else {
    console.log(`  ✅ No extra spaces`);
  }

  console.log('');
});
