// Test the fixed ParticipantId validation logic
class ParticipantId {
  constructor(value) {
    if (!this.isValid(value)) {
      throw new Error(`Invalid participant ID: ${value}`);
    }
    this.value = value;
  }

  static create(value) {
    const stringValue = typeof value === 'number' ? value.toString() : value;
    return new ParticipantId(stringValue);
  }

  getValue() {
    return this.value;
  }

  // Fixed validation method
  isValid(value) {
    // Value is already converted to string in create() method
    return typeof value === 'string' &&
           value.length > 0 &&
           value.length <= 100 &&
           // Allow alphanumeric, underscores, hyphens, and pure numeric IDs from video services
           /^[a-zA-Z0-9_.-]+$/.test(value);
  }
}

// Test with Zoom userId that was failing
console.log('Testing fixed ParticipantId with Zoom userId...');

try {
  const zoomUserId = 16778240;
  console.log('Creating ParticipantId with numeric value:', zoomUserId);

  const participantId = ParticipantId.create(zoomUserId);
  console.log('✅ SUCCESS! ParticipantId created:', participantId.getValue());
  console.log('Type of stored value:', typeof participantId.getValue());
} catch (error) {
  console.error('❌ FAILED:', error.message);
}

// Test with other values
const testValues = [
  123456,
  '123456',
  'user_123',
  'participant-456',
  'coach.789'
];

testValues.forEach(testValue => {
  try {
    const id = ParticipantId.create(testValue);
    console.log(`✅ '${testValue}' (${typeof testValue}) -> '${id.getValue()}'`);
  } catch (error) {
    console.log(`❌ '${testValue}' (${typeof testValue}) -> ${error.message}`);
  }
});