// Agora Configuration Test Script
// Run this to validate your Agora setup

// Simple color functions without chalk dependency
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const blue = (text) => `\x1b[34m${text}\x1b[0m`;

console.log(blue('\n=== Agora Configuration Test ===\n'));

// Check environment variables
const appId = process.env.VITE_AGORA_APP_ID || '';
const appCertificate = process.env.VITE_AGORA_APP_CERTIFICATE || '';

console.log('1. Environment Variables Check:');
console.log('--------------------------------');

// App ID validation
if (!appId) {
  console.log(red('❌ VITE_AGORA_APP_ID is not set'));
} else if (appId.length !== 32) {
  console.log(yellow(`⚠️  VITE_AGORA_APP_ID exists but length is ${appId.length} (expected 32)`));
  console.log(`   Value: ${appId.substring(0, 8)}...`);
} else {
  console.log(green('✅ VITE_AGORA_APP_ID is configured correctly'));
  console.log(`   Value: ${appId.substring(0, 8)}...`);
}

// App Certificate validation
if (!appCertificate) {
  console.log(yellow('⚠️  VITE_AGORA_APP_CERTIFICATE is not set (Testing mode - OK for development)'));
} else if (appCertificate.length !== 32) {
  console.log(yellow(`⚠️  VITE_AGORA_APP_CERTIFICATE exists but length is ${appCertificate.length} (expected 32)`));
} else {
  console.log(green('✅ VITE_AGORA_APP_CERTIFICATE is configured correctly'));
  console.log(`   Value: ${appCertificate.substring(0, 8)}...`);
}

// Token generation test
console.log('\n2. Token Generation Test:');
console.log('-------------------------');

if (appCertificate && appCertificate.length === 32) {
  try {
    const { RtcTokenBuilder, RtcRole } = require('agora-token');

    const channelName = 'fitwithpari_test_session';
    const uid = 0;
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );

    console.log(green('✅ Token generation successful!'));
    console.log(`   Channel: ${channelName}`);
    console.log(`   Token preview: ${token.substring(0, 50)}...`);
    console.log(`   Expires at: ${new Date(privilegeExpiredTs * 1000).toISOString()}`);
  } catch (error) {
    console.log(red('❌ Token generation failed:'), error.message);
  }
} else {
  console.log(yellow('⚠️  Skipping token generation (App Certificate not configured)'));
  console.log('   The app will work in testing mode without tokens');
}

// Production readiness check
console.log('\n3. Production Readiness:');
console.log('------------------------');

const issues = [];

if (!appId || appId.length !== 32) {
  issues.push('Configure valid VITE_AGORA_APP_ID');
}

if (!appCertificate || appCertificate.length !== 32) {
  issues.push('Configure VITE_AGORA_APP_CERTIFICATE for production');
}

if (issues.length === 0) {
  console.log(green('✅ Ready for production!'));
} else {
  console.log(yellow('⚠️  Not ready for production. Issues to resolve:'));
  issues.forEach(issue => {
    console.log(`   - ${issue}`);
  });
}

// Next steps
console.log('\n4. Next Steps:');
console.log('--------------');

if (!appCertificate) {
  console.log('To enable production token authentication:');
  console.log('1. Go to https://console.agora.io/');
  console.log('2. Select your project');
  console.log('3. Go to "Config" → "Basic Info"');
  console.log('4. Enable "App Certificate" if not already enabled');
  console.log('5. Copy the App Certificate');
  console.log('6. Add to .env: VITE_AGORA_APP_CERTIFICATE=your_certificate_here');
  console.log('7. Restart your development server');
} else {
  console.log(green('✅ App Certificate is configured!'));
  console.log('You can now:');
  console.log('1. Test with multiple participants');
  console.log('2. Implement token renewal logic');
  console.log('3. Configure CDN live streaming for scale');
}

console.log(blue('\n=== Test Complete ===\n'));