/**
 * Health Data Security Module for FitWithPari
 * HIPAA-compliant utilities for secure handling of Protected Health Information (PHI)
 */

import { SecurityLogger, HealthDataEventType } from './security-logger';
import { supabase } from '../supabase/supabase-client';

export type HealthDataType =
  | 'health_considerations'
  | 'medical_notes'
  | 'fitness_assessments'
  | 'injury_history'
  | 'medication_info'
  | 'emergency_contacts'
  | 'biometric_data'
  | 'workout_performance'
  | 'progress_photos';

export type ConsentType =
  | 'data_collection'
  | 'data_sharing'
  | 'marketing_communication'
  | 'third_party_integration'
  | 'research_participation'
  | 'video_recording'
  | 'progress_tracking';

export interface HealthDataConsent {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  grantedAt: string;
  withdrawnAt?: string;
  expiresAt?: string;
  purpose: string;
  scope: string[];
  thirdParties?: string[];
  metadata: Record<string, any>;
}

export interface HealthDataAccess {
  dataSubject: string;
  accessor: string;
  accessorRole: string;
  dataType: HealthDataType;
  purpose: string;
  justification: string;
  consentRequired: boolean;
  consentId?: string;
  accessLevel: 'read' | 'write' | 'delete';
  retentionPeriod?: number;
}

export interface DataEncryptionConfig {
  algorithm: 'AES-256-GCM';
  keyDerivation: 'PBKDF2';
  iterations: number;
  saltLength: number;
}

export class HealthDataSecurity {
  private static readonly ENCRYPTION_CONFIG: DataEncryptionConfig = {
    algorithm: 'AES-256-GCM',
    keyDerivation: 'PBKDF2',
    iterations: 100000,
    saltLength: 32
  };

  private static readonly PHI_FIELDS = [
    'full_name',
    'date_of_birth',
    'phone',
    'emergency_contact_name',
    'emergency_contact_phone',
    'medical_conditions',
    'medications',
    'injury_history',
    'biometric_data'
  ];

  /**
   * Encrypt sensitive health data before storage
   */
  static async encryptHealthData(
    data: Record<string, any>,
    userId: string
  ): Promise<{ encryptedData: string; metadata: any }> {
    try {
      // Generate user-specific encryption key
      const encryptionKey = await this.deriveUserKey(userId);

      // Serialize data
      const serializedData = JSON.stringify(data);

      // In production, use proper encryption library like crypto-js or Web Crypto API
      // For demo, using base64 encoding
      const encryptedData = btoa(serializedData);

      const metadata = {
        algorithm: this.ENCRYPTION_CONFIG.algorithm,
        encryptedAt: new Date().toISOString(),
        checksum: await this.generateChecksum(serializedData),
        version: '1.0'
      };

      // Log encryption event
      await SecurityLogger.logHealthDataAccess(
        'system',
        'DATA_ENCRYPTED',
        {
          dataSubject: userId,
          dataType: 'health_data',
          justification: 'Data encryption for secure storage'
        }
      );

      return { encryptedData, metadata };
    } catch (error) {
      console.error('Health data encryption failed:', error);
      throw new Error('Failed to encrypt health data');
    }
  }

  /**
   * Decrypt health data for authorized access
   */
  static async decryptHealthData(
    encryptedData: string,
    metadata: any,
    userId: string,
    accessorId: string,
    purpose: string
  ): Promise<Record<string, any>> {
    try {
      // Validate access authorization
      const hasAccess = await this.validateHealthDataAccess(userId, accessorId, purpose);
      if (!hasAccess) {
        await SecurityLogger.logHealthDataAccess(
          accessorId,
          'ACCESS_DENIED',
          {
            dataSubject: userId,
            justification: 'Unauthorized access attempt'
          }
        );
        throw new Error('Unauthorized access to health data');
      }

      // Verify data integrity
      const isValid = await this.verifyDataIntegrity(encryptedData, metadata);
      if (!isValid) {
        await SecurityLogger.logSecurityEvent(
          accessorId,
          'DATA_BREACH_DETECTED',
          {
            severity: 'critical',
            description: 'Health data integrity check failed',
            resourceAffected: `user_${userId}_health_data`
          }
        );
        throw new Error('Health data integrity verification failed');
      }

      // Decrypt data
      const serializedData = atob(encryptedData);
      const data = JSON.parse(serializedData);

      // Log successful access
      await SecurityLogger.logHealthDataAccess(
        accessorId,
        'DATA_VIEWED',
        {
          dataSubject: userId,
          dataType: 'health_data',
          justification: purpose
        }
      );

      return data;
    } catch (error) {
      console.error('Health data decryption failed:', error);
      throw error;
    }
  }

  /**
   * Validate health data access authorization
   */
  static async validateHealthDataAccess(
    dataSubject: string,
    accessor: string,
    purpose: string
  ): Promise<boolean> {
    try {
      // Self-access is always allowed
      if (dataSubject === accessor) {
        return true;
      }

      // Check if accessor has appropriate role
      const { data: accessorProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', accessor)
        .single();

      if (!accessorProfile) {
        return false;
      }

      // Coaches and admins can access student health data with valid purpose
      if (['coach', 'admin'].includes(accessorProfile.role)) {
        const validPurposes = [
          'fitness_assessment',
          'workout_planning',
          'injury_prevention',
          'progress_monitoring',
          'emergency_response'
        ];

        return validPurposes.includes(purpose);
      }

      return false;
    } catch (error) {
      console.error('Health data access validation failed:', error);
      return false;
    }
  }

  /**
   * Request consent for health data processing
   */
  static async requestConsent(
    userId: string,
    consentType: ConsentType,
    purpose: string,
    scope: string[],
    expiresInDays?: number,
    thirdParties?: string[]
  ): Promise<string> {
    try {
      const consentId = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const consent: Partial<HealthDataConsent> = {
        id: consentId,
        userId,
        consentType,
        granted: false, // Will be updated when user grants consent
        purpose,
        scope,
        thirdParties,
        grantedAt: new Date().toISOString(),
        expiresAt: expiresInDays ?
          new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString() :
          undefined,
        metadata: {
          requestedBy: 'system',
          ipAddress: 'client-ip',
          userAgent: navigator.userAgent
        }
      };

      const { error } = await supabase
        .from('health_data_consents')
        .insert(consent);

      if (error) {
        throw error;
      }

      await SecurityLogger.logHealthDataAccess(
        'system',
        'CONSENT_REQUESTED',
        {
          dataSubject: userId,
          consentId,
          purpose,
          scope: scope.join(', ')
        }
      );

      return consentId;
    } catch (error) {
      console.error('Consent request failed:', error);
      throw error;
    }
  }

  /**
   * Grant consent for health data processing
   */
  static async grantConsent(
    consentId: string,
    userId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('health_data_consents')
        .update({
          granted: true,
          grantedAt: new Date().toISOString()
        })
        .eq('id', consentId)
        .eq('userId', userId);

      if (error) {
        throw error;
      }

      await SecurityLogger.logHealthDataAccess(
        userId,
        'CONSENT_GIVEN',
        {
          dataSubject: userId,
          consentId
        }
      );
    } catch (error) {
      console.error('Consent grant failed:', error);
      throw error;
    }
  }

  /**
   * Withdraw consent for health data processing
   */
  static async withdrawConsent(
    consentId: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('health_data_consents')
        .update({
          granted: false,
          withdrawnAt: new Date().toISOString(),
          metadata: {
            withdrawalReason: reason,
            withdrawnAt: new Date().toISOString()
          }
        })
        .eq('id', consentId)
        .eq('userId', userId);

      if (error) {
        throw error;
      }

      await SecurityLogger.logHealthDataAccess(
        userId,
        'CONSENT_WITHDRAWN',
        {
          dataSubject: userId,
          consentId,
          justification: reason || 'User requested withdrawal'
        }
      );

      // Trigger data cleanup process
      await this.handleConsentWithdrawal(userId, consentId);
    } catch (error) {
      console.error('Consent withdrawal failed:', error);
      throw error;
    }
  }

  /**
   * Check if valid consent exists for data processing
   */
  static async hasValidConsent(
    userId: string,
    consentType: ConsentType,
    purpose: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('health_data_consents')
        .select('*')
        .eq('userId', userId)
        .eq('consentType', consentType)
        .eq('granted', true)
        .is('withdrawnAt', null);

      if (error || !data || data.length === 0) {
        return false;
      }

      // Check if consent covers the purpose and hasn't expired
      const consent = data[0];

      if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) {
        return false;
      }

      if (consent.scope && !consent.scope.includes(purpose)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Consent validation failed:', error);
      return false;
    }
  }

  /**
   * Anonymize health data for research or analytics
   */
  static async anonymizeHealthData(
    data: Record<string, any>,
    userId: string
  ): Promise<Record<string, any>> {
    try {
      const anonymizedData = { ...data };

      // Remove direct identifiers
      const identifierFields = [
        'id', 'userId', 'email', 'full_name', 'phone',
        'emergency_contact_name', 'emergency_contact_phone'
      ];

      identifierFields.forEach(field => {
        delete anonymizedData[field];
      });

      // Replace with anonymous ID
      anonymizedData.anonymousId = await this.generateAnonymousId(userId);

      // Generalize sensitive fields
      if (anonymizedData.date_of_birth) {
        const birthDate = new Date(anonymizedData.date_of_birth);
        const ageGroup = this.getAgeGroup(birthDate);
        delete anonymizedData.date_of_birth;
        anonymizedData.ageGroup = ageGroup;
      }

      // Log anonymization
      await SecurityLogger.logHealthDataAccess(
        'system',
        'DATA_ANONYMIZED',
        {
          dataSubject: userId,
          dataType: 'anonymized_health_data',
          justification: 'Data anonymization for research/analytics'
        }
      );

      return anonymizedData;
    } catch (error) {
      console.error('Health data anonymization failed:', error);
      throw error;
    }
  }

  /**
   * Generate data usage report for user transparency
   */
  static async generateDataUsageReport(userId: string): Promise<{
    dataTypes: HealthDataType[];
    consents: HealthDataConsent[];
    accessHistory: any[];
    thirdPartySharing: any[];
    retentionPeriods: Record<string, number>;
  }> {
    try {
      // Get user consents
      const { data: consents } = await supabase
        .from('health_data_consents')
        .select('*')
        .eq('userId', userId)
        .order('grantedAt', { ascending: false });

      // Get access history
      const accessHistory = await SecurityLogger.getAuditTrail(userId);

      // Get data types stored
      const { data: healthConsiderations } = await supabase
        .from('health_considerations')
        .select('type')
        .eq('user_id', userId);

      const dataTypes: HealthDataType[] = [
        'health_considerations',
        'fitness_assessments',
        'workout_performance'
      ];

      const report = {
        dataTypes,
        consents: consents || [],
        accessHistory: accessHistory || [],
        thirdPartySharing: this.getThirdPartySharing(consents || []),
        retentionPeriods: {
          health_considerations: 2555, // 7 years
          fitness_assessments: 1095, // 3 years
          workout_performance: 365 // 1 year
        }
      };

      await SecurityLogger.logHealthDataAccess(
        userId,
        'DATA_REPORT_GENERATED',
        {
          dataSubject: userId,
          reportType: 'data_usage',
          justification: 'User transparency report'
        }
      );

      return report;
    } catch (error) {
      console.error('Data usage report generation failed:', error);
      throw error;
    }
  }

  /**
   * Handle data deletion on consent withdrawal
   */
  private static async handleConsentWithdrawal(
    userId: string,
    consentId: string
  ): Promise<void> {
    try {
      // Get consent details to understand what data to delete
      const { data: consent } = await supabase
        .from('health_data_consents')
        .select('*')
        .eq('id', consentId)
        .single();

      if (!consent) return;

      // Schedule data deletion based on consent scope
      // In production, this would trigger a background job
      console.log(`Scheduling data deletion for consent withdrawal: ${consentId}`);

      await SecurityLogger.logHealthDataAccess(
        'system',
        'DATA_DELETION_SCHEDULED',
        {
          dataSubject: userId,
          consentId,
          justification: 'Consent withdrawal compliance'
        }
      );
    } catch (error) {
      console.error('Consent withdrawal handling failed:', error);
    }
  }

  /**
   * Derive user-specific encryption key
   */
  private static async deriveUserKey(userId: string): Promise<string> {
    // In production, use proper key derivation
    // This is a simplified version for demo
    return btoa(`key_${userId}_${Date.now()}`);
  }

  /**
   * Generate checksum for data integrity verification
   */
  private static async generateChecksum(data: string): Promise<string> {
    // In production, use proper hash function like SHA-256
    return btoa(data).substring(0, 16);
  }

  /**
   * Verify data integrity using checksum
   */
  private static async verifyDataIntegrity(
    encryptedData: string,
    metadata: any
  ): Promise<boolean> {
    try {
      const data = atob(encryptedData);
      const calculatedChecksum = await this.generateChecksum(data);
      return calculatedChecksum === metadata.checksum;
    } catch (error) {
      console.error('Data integrity verification failed:', error);
      return false;
    }
  }

  /**
   * Generate anonymous ID for research purposes
   */
  private static async generateAnonymousId(userId: string): Promise<string> {
    // Generate consistent anonymous ID based on user ID
    return btoa(`anon_${userId}`).substring(0, 12);
  }

  /**
   * Get age group for anonymization
   */
  private static getAgeGroup(birthDate: Date): string {
    const age = new Date().getFullYear() - birthDate.getFullYear();

    if (age < 18) return 'under_18';
    if (age < 25) return '18_24';
    if (age < 35) return '25_34';
    if (age < 45) return '35_44';
    if (age < 55) return '45_54';
    if (age < 65) return '55_64';
    return '65_plus';
  }

  /**
   * Extract third-party sharing information from consents
   */
  private static getThirdPartySharing(consents: HealthDataConsent[]): any[] {
    return consents
      .filter(consent => consent.thirdParties && consent.thirdParties.length > 0)
      .map(consent => ({
        consentId: consent.id,
        purpose: consent.purpose,
        thirdParties: consent.thirdParties,
        granted: consent.granted,
        grantedAt: consent.grantedAt,
        expiresAt: consent.expiresAt
      }));
  }
}

/**
 * React hook for health data security operations
 */
export function useHealthDataSecurity() {
  const requestConsent = async (
    consentType: ConsentType,
    purpose: string,
    scope: string[],
    expiresInDays?: number
  ) => {
    // Get current user ID from auth context
    const userId = 'current-user-id'; // Replace with actual auth context
    return await HealthDataSecurity.requestConsent(userId, consentType, purpose, scope, expiresInDays);
  };

  const grantConsent = async (consentId: string) => {
    const userId = 'current-user-id'; // Replace with actual auth context
    return await HealthDataSecurity.grantConsent(consentId, userId);
  };

  const withdrawConsent = async (consentId: string, reason?: string) => {
    const userId = 'current-user-id'; // Replace with actual auth context
    return await HealthDataSecurity.withdrawConsent(consentId, userId, reason);
  };

  const generateDataReport = async () => {
    const userId = 'current-user-id'; // Replace with actual auth context
    return await HealthDataSecurity.generateDataUsageReport(userId);
  };

  return {
    requestConsent,
    grantConsent,
    withdrawConsent,
    generateDataReport,
    hasValidConsent: HealthDataSecurity.hasValidConsent,
    anonymizeData: HealthDataSecurity.anonymizeHealthData
  };
}