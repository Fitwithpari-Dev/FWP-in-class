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

  static create(value: string): ParticipantId {
    return new ParticipantId(value);
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
    return typeof value === 'string' &&
           value.length > 0 &&
           value.length <= 100 &&
           /^[a-zA-Z0-9_-]+$/.test(value);
  }
}