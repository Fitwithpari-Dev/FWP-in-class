/**
 * Connection Quality Value Object
 * Represents the quality of a participant's connection
 */
export type ConnectionQualityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

export class ConnectionQuality {
  private constructor(private readonly level: ConnectionQualityLevel) {}

  static excellent(): ConnectionQuality {
    return new ConnectionQuality('excellent');
  }

  static good(): ConnectionQuality {
    return new ConnectionQuality('good');
  }

  static fair(): ConnectionQuality {
    return new ConnectionQuality('fair');
  }

  static poor(): ConnectionQuality {
    return new ConnectionQuality('poor');
  }

  static unknown(): ConnectionQuality {
    return new ConnectionQuality('unknown');
  }

  static fromNumber(value: number): ConnectionQuality {
    if (value >= 0.8) return ConnectionQuality.excellent();
    if (value >= 0.6) return ConnectionQuality.good();
    if (value >= 0.4) return ConnectionQuality.fair();
    if (value >= 0.2) return ConnectionQuality.poor();
    return ConnectionQuality.unknown();
  }

  getLevel(): ConnectionQualityLevel {
    return this.level;
  }

  isGoodOrBetter(): boolean {
    return this.level === 'excellent' || this.level === 'good';
  }

  canReceiveHighQualityVideo(): boolean {
    return this.level === 'excellent' || this.level === 'good';
  }

  shouldUseAudioOnly(): boolean {
    return this.level === 'poor';
  }

  equals(other: ConnectionQuality): boolean {
    return this.level === other.level;
  }

  toString(): string {
    return this.level;
  }
}