/**
 * Participant ID Value Object
 * Strong typing for participant identifiers
 */
export class ParticipantId {
  private constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new Error(`Invalid participant ID: ${value}`);
    }
  }

  static create(value: string | number): ParticipantId {
    const stringValue = typeof value === 'number' ? value.toString() : value;
    return new ParticipantId(stringValue);
  }

  static generate(prefix: string = 'participant'): ParticipantId {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    return new ParticipantId(`${prefix}_${timestamp}_${randomPart}`);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ParticipantId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  private isValid(value: string): boolean {
    // Accept string or number values from video services
    const stringValue = typeof value === 'number' ? value.toString() : value;

    return typeof stringValue === 'string' &&
           stringValue.length > 0 &&
           stringValue.length <= 100 &&
           // Allow alphanumeric, underscores, hyphens, and pure numeric IDs from video services
           /^[a-zA-Z0-9_.-]+$/.test(stringValue);
  }
}