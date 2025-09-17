// Simulate exact ParticipantId validation from V2
function isValid(value) {
  // Accept string or number values from video services
  const stringValue = typeof value === 'number' ? value.toString() : value;

  console.log('isValid validation steps:');
  console.log('1. Original value:', value, 'type:', typeof value);
  console.log('2. String value:', stringValue, 'type:', typeof stringValue);

  const step1 = typeof stringValue === 'string';
  console.log('3. Is string?', step1);

  const step2 = stringValue.length > 0;
  console.log('4. Length > 0?', step2, 'length:', stringValue.length);

  const step3 = stringValue.length <= 100;
  console.log('5. Length <= 100?', step3);

  const step4 = /^[a-zA-Z0-9_.-]+$/.test(stringValue);
  console.log('6. Regex test?', step4);

  const result = step1 && step2 && step3 && step4;
  console.log('7. Final result:', result);

  return result;
}

// Test with the failing Zoom userId
const zoomUserId = 16778240;
console.log('=== Testing Zoom userId:', zoomUserId, '===');
isValid(zoomUserId);

console.log('\n=== Testing string version ===');
isValid(zoomUserId.toString());

console.log('\n=== Testing potential edge cases ===');
isValid(null);
isValid(undefined);
isValid('');
isValid('16778240');