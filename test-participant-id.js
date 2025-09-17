// Test ParticipantId validation with Zoom userId
const testValue = "16778240";
const regex = /^[a-zA-Z0-9_.-]+$/;

console.log('Testing ParticipantId validation:');
console.log('Value:', testValue);
console.log('Type:', typeof testValue);
console.log('Length:', testValue.length);
console.log('Regex test result:', regex.test(testValue));
console.log('Individual char tests:');
for (let i = 0; i < testValue.length; i++) {
  const char = testValue[i];
  const charCode = char.charCodeAt(0);
  const isValid = /[a-zA-Z0-9_.-]/.test(char);
  console.log(`  '${char}' (code: ${charCode}) -> ${isValid}`);
}

// Test with number conversion
const numberValue = 16778240;
const stringValue = numberValue.toString();
console.log('\nWith number conversion:');
console.log('Number value:', numberValue);
console.log('String value:', stringValue);
console.log('String regex test:', regex.test(stringValue));