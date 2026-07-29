const fs = require('fs');
const path = require('path');

const bsPath = path.join(__dirname, '../src/messages/bs.json');
const enPath = path.join(__dirname, '../src/messages/en.json');

const bs = JSON.parse(fs.readFileSync(bsPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(getKeys(obj[key], `${prefix}${key}.`));
    } else {
      keys.push(`${prefix}${key}`);
    }
  }
  return keys;
}

const bsKeys = new Set(getKeys(bs));
const enKeys = new Set(getKeys(en));

const missingInEn = [...bsKeys].filter(k => !enKeys.has(k));
const missingInBs = [...enKeys].filter(k => !bsKeys.has(k));

if (missingInEn.length > 0 || missingInBs.length > 0) {
  console.error('❌ i18n key parity check failed!');
  if (missingInEn.length > 0) {
    console.error('Keys in bs.json missing in en.json:', missingInEn);
  }
  if (missingInBs.length > 0) {
    console.error('Keys in en.json missing in bs.json:', missingInBs);
  }
  process.exit(1);
}

console.log('✅ i18n key parity check passed! Both bs.json and en.json have matching keys.');
