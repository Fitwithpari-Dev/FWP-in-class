/**
 * Session ID Value Object
 * Ensures session IDs are always valid and typed
 */
export class SessionId {
  private constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new Error(`Invalid session ID: ${value}`);
    }
  }

  static create(value: string): SessionId {
    return new SessionId(value);
  }

  static generate(): SessionId {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return new SessionId(`session_${timestamp}_${randomPart}`);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: SessionId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  private isValid(value: string): boolean {
    // Session ID must be non-empty and contain valid characters
    return typeof value === 'string' &&
           value.length > 0 &&
           value.length <= 100 &&
           /^[a-zA-Z0-9_-]+$/.test(value);
  }
}