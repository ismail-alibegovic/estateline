const fs = require('fs');
const path = require('path');

const envExamplePath = path.join(__dirname, '../.env.example');
const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');

const envKeys = new Set(
  envExampleContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => line.split('=')[0].trim())
);

const srcDir = path.join(__dirname, '../src');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = getAllFiles(srcDir);
const referencedKeys = new Set();
const regex = /process\.env\.([A-Z0-9_]+)/g;

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    // Ignore standard Node/Next env vars
    if (!['NODE_ENV', 'VERCEL_ENV', 'VERCEL_URL', 'NEXT_RUNTIME'].includes(key)) {
      referencedKeys.add(key);
    }
  }
}

const missingInEnvExample = [...referencedKeys].filter(key => !envKeys.has(key));

if (missingInEnvExample.length > 0) {
  console.error('❌ Environment variables parity check failed!');
  console.error('The following process.env variables were found in src/ but are missing from .env.example:');
  console.error(missingInEnvExample);
  process.exit(1);
}

console.log(`✅ .env.example parity check passed! All ${referencedKeys.size} process.env variables in src/ are documented in .env.example.`);
