// Load environment variables from .env file
require('dotenv').config();

// Simple color functions
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const blue = (text) => `\x1b[34m${text}\x1b[0m`;

console.log(blue('\n=== Agora Environment Check ===\n'));

// Check Agora variables
const appId = process.env.VITE_AGORA_APP_ID;
const appCertificate = process.env.VITE_AGORA_APP_CERTIFICATE;

console.log('Agora Configuration:');
console.log('-------------------');
console.log(`App ID: ${appId ? green(`${appId.substring(0, 8)}...`) : red('NOT SET')}`);
console.log(`App Certificate: ${appCertificate ? green(`${appCertificate.substring(0, 8)}...`) : yellow('NOT SET (Testing mode)')}`);

if (appId === '39a27953242243799ea996e3f460a22a') {
  console.log(green('\n✅ App ID matches expected value from .env file'));
} else {
  console.log(red('\n❌ App ID does not match expected value'));
}

console.log(blue('\n=== Check Complete ===\n'));