/**
 * Security Logger for FitWithPari - HIPAA Compliant Audit System
 * Provides comprehensive logging for security events, health data access, and audit trails
 */

import { supabase } from '../supabase/supabase-client';

export type AuthEventType =
  | 'SIGN_IN'
  | 'SIGN_OUT'
  | 'SIGN_UP'
  | 'PASSWORD_RESET'
  | 'PASSWORD_CHANGED'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED';

export type SecurityEventType =
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'SUSPICIOUS_ACTIVITY'
  | 'DATA_BREACH_DETECTED'
  | 'PERMISSION_VIOLATION'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INJECTION_ATTEMPT'
  | 'XSS_ATTEMPT'
  | 'CSRF_ATTEMPT';

export type HealthDataEventType =
  | 'ACCESS_REQUESTED'
  | 'ACCESS_GRANTED'
  | 'ACCESS_DENIED'
  | 'DATA_VIEWED'
  | 'DATA_MODIFIED'
  | 'DATA_DELETED'
  | 'DATA_EXPORTED'
  | 'CONSENT_GIVEN'
  | 'CONSENT_WITHDRAWN';

export interface BaseLogEvent {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AuthEvent extends BaseLogEvent {
  eventType: AuthEventType;
  success?: boolean;
  failureReason?: string;
  role?: string;
}

export interface SecurityEvent extends BaseLogEvent {
  eventType: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resourceAffected?: string;
  actionTaken?: string;
}

export interface HealthDataEvent extends BaseLogEvent {
  eventType: HealthDataEventType;
  dataType: string;
  dataSubject: string; // The user whose health data is being accessed
  accessor: string; // The user accessing the data
  justification?: string;
  consentId?: string;
  retentionPeriod?: number; // Days
}

export class SecurityLogger {
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly BATCH_SIZE = 10;
  private static pendingLogs: any[] = [];

  /**
   * Log authentication events
   */
  static async logAuthEvent(
    userId: string,
    eventType: AuthEventType,
    details: Partial<AuthEvent>
  ): Promise<void> {
    const event: AuthEvent = {
      userId,
      eventType,
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId(),
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      ...details
    };

    await this.writeLog('auth_events', event);

    // Alert on critical auth events
    if (this.isCriticalAuthEvent(eventType, details)) {
      await this.sendSecurityAlert(event);
    }
  }

  /**
   * Log security events and potential threats
   */
  static async logSecurityEvent(
    userId: string | null,
    eventType: SecurityEventType,
    details: Partial<SecurityEvent>
  ): Promise<void> {
    const event: SecurityEvent = {
      userId: userId || undefined,
      eventType,
      severity: details.severity || 'medium',
      description: details.description || '',
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId(),
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      ...details
    };

    await this.writeLog('security_events', event);

    // Immediate alert for high/critical severity events
    if (event.severity === 'high' || event.severity === 'critical') {
      await this.sendSecurityAlert(event);
    }
  }

  /**
   * Log health data access events (HIPAA compliance)
   */
  static async logHealthDataAccess(
    accessorId: string,
    eventType: HealthDataEventType,
    details: {
      dataSubject?: string;
      dataType?: string;
      justification?: string;
      consentId?: string;
      retentionPeriod?: number;
      [key: string]: any;
    }
  ): Promise<string> {
    const auditId = this.generateAuditId();

    const event: HealthDataEvent = {
      userId: accessorId,
      eventType,
      dataType: details.dataType || 'unknown',
      dataSubject: details.dataSubject || accessorId,
      accessor: accessorId,
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId(),
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      justification: details.justification,
      consentId: details.consentId,
      retentionPeriod: details.retentionPeriod || 2555, // 7 years default for HIPAA
      metadata: {
        auditId,
        ...details
      }
    };

    await this.writeLog('health_data_audit', event);

    // All health data access requires immediate logging confirmation
    console.log(`Health data access logged: ${auditId}`);

    return auditId;
  }

  /**
   * Log video session access and activities
   */
  static async logVideoSessionEvent(
    userId: string,
    sessionId: string,
    eventType: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    const event = {
      userId,
      sessionId,
      eventType,
      timestamp: new Date().toISOString(),
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      ...details
    };

    await this.writeLog('video_session_events', event);
  }

  /**
   * Log API access events for monitoring
   */
  static async logApiAccess(
    userId: string | null,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    details: Record<string, any> = {}
  ): Promise<void> {
    const event = {
      userId,
      endpoint,
      method,
      statusCode,
      responseTime,
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId(),
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      ...details
    };

    await this.writeLog('api_access_logs', event);

    // Alert on suspicious API activity
    if (this.isSuspiciousApiActivity(statusCode, responseTime, endpoint)) {
      await this.logSecurityEvent(userId, 'SUSPICIOUS_ACTIVITY', {
        severity: 'medium',
        description: `Suspicious API activity detected: ${method} ${endpoint}`,
        resourceAffected: endpoint
      });
    }
  }

  /**
   * Write log entry to database with retry logic
   */
  private static async writeLog(
    table: string,
    event: any,
    attempt: number = 1
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from(table)
        .insert(event);

      if (error) {
        throw error;
      }

      console.log(`Log written to ${table}:`, event.eventType || event.endpoint);
    } catch (error) {
      console.error(`Failed to write log to ${table} (attempt ${attempt}):`, error);

      if (attempt < this.MAX_RETRY_ATTEMPTS) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        setTimeout(() => {
          this.writeLog(table, event, attempt + 1);
        }, delay);
      } else {
        // Add to pending logs for batch retry
        this.pendingLogs.push({ table, event });
        console.error('Max retry attempts reached, added to pending logs');
      }
    }
  }

  /**
   * Retry failed log writes in batch
   */
  static async retryPendingLogs(): Promise<void> {
    if (this.pendingLogs.length === 0) return;

    const batch = this.pendingLogs.splice(0, this.BATCH_SIZE);

    for (const { table, event } of batch) {
      try {
        await this.writeLog(table, event);
      } catch (error) {
        console.error('Batch retry failed for log:', error);
      }
    }
  }

  /**
   * Generate unique session ID
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique audit ID for health data access
   */
  private static generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get client IP address (simplified for demo)
   */
  private static async getClientIP(): Promise<string> {
    // In production, this should be handled server-side
    // For demo purposes, returning a placeholder
    return 'client-ip';
  }

  /**
   * Check if auth event is critical and requires immediate attention
   */
  private static isCriticalAuthEvent(
    eventType: AuthEventType,
    details: Partial<AuthEvent>
  ): boolean {
    return (
      eventType === 'ACCOUNT_LOCKED' ||
      eventType === 'ACCOUNT_UNLOCKED' ||
      (eventType === 'SIGN_IN' && details.success === false) ||
      eventType === 'PASSWORD_CHANGED'
    );
  }

  /**
   * Check for suspicious API activity
   */
  private static isSuspiciousApiActivity(
    statusCode: number,
    responseTime: number,
    endpoint: string
  ): boolean {
    return (
      statusCode === 401 || // Unauthorized
      statusCode === 403 || // Forbidden
      responseTime > 5000 || // Very slow response
      endpoint.includes('health') || // Health data access
      endpoint.includes('admin') // Admin endpoints
    );
  }

  /**
   * Send security alert (email, Slack, etc.)
   */
  private static async sendSecurityAlert(event: any): Promise<void> {
    try {
      // In production, integrate with alerting system
      console.warn('SECURITY ALERT:', event);

      // Could integrate with:
      // - Email notifications
      // - Slack webhook
      // - PagerDuty
      // - AWS SNS

      // For now, just log to console and database
      await this.writeLog('security_alerts', {
        alertType: 'SECURITY_EVENT',
        event,
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  /**
   * Get audit trail for a specific user or data subject
   */
  static async getAuditTrail(
    dataSubject: string,
    startDate?: string,
    endDate?: string,
    eventTypes?: HealthDataEventType[]
  ): Promise<HealthDataEvent[]> {
    try {
      let query = supabase
        .from('health_data_audit')
        .select('*')
        .eq('dataSubject', dataSubject)
        .order('timestamp', { ascending: false });

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }

      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      if (eventTypes && eventTypes.length > 0) {
        query = query.in('eventType', eventTypes);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get audit trail:', error);
      throw error;
    }
  }

  /**
   * Generate compliance report for HIPAA audit
   */
  static async generateComplianceReport(
    startDate: string,
    endDate: string
  ): Promise<{
    totalHealthDataAccesses: number;
    accessByType: Record<string, number>;
    accessByUser: Record<string, number>;
    unauthorizedAttempts: number;
    consentWithdrawals: number;
  }> {
    try {
      const { data: healthAccess } = await supabase
        .from('health_data_audit')
        .select('*')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate);

      const { data: securityEvents } = await supabase
        .from('security_events')
        .select('*')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .eq('eventType', 'UNAUTHORIZED_ACCESS_ATTEMPT');

      const report = {
        totalHealthDataAccesses: healthAccess?.length || 0,
        accessByType: {},
        accessByUser: {},
        unauthorizedAttempts: securityEvents?.length || 0,
        consentWithdrawals: 0
      };

      // Process health data access statistics
      healthAccess?.forEach(event => {
        // Count by data type
        const dataType = event.dataType || 'unknown';
        report.accessByType[dataType] = (report.accessByType[dataType] || 0) + 1;

        // Count by user
        const accessor = event.accessor || 'unknown';
        report.accessByUser[accessor] = (report.accessByUser[accessor] || 0) + 1;

        // Count consent withdrawals
        if (event.eventType === 'CONSENT_WITHDRAWN') {
          report.consentWithdrawals++;
        }
      });

      return report;
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  /**
   * Clean up old logs based on retention policy
   */
  static async cleanupOldLogs(): Promise<void> {
    try {
      const retentionDays = 2555; // 7 years for HIPAA compliance
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

      // Archive old logs before deletion (in production)
      // For now, just mark them for archival
      await supabase
        .from('health_data_audit')
        .update({ archived: true })
        .lt('timestamp', cutoffDate);

      console.log(`Archived health data audit logs older than ${cutoffDate}`);

      // Clean up non-critical logs more aggressively
      const shortRetentionDays = 365; // 1 year
      const shortCutoffDate = new Date(Date.now() - shortRetentionDays * 24 * 60 * 60 * 1000).toISOString();

      await supabase
        .from('api_access_logs')
        .delete()
        .lt('timestamp', shortCutoffDate);

      console.log(`Deleted API access logs older than ${shortCutoffDate}`);
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }
}

/**
 * React hook for security logging in components
 */
export function useSecurityLogger() {
  const logAuthEvent = (eventType: AuthEventType, details: Partial<AuthEvent> = {}) => {
    const userId = details.userId || 'anonymous';
    SecurityLogger.logAuthEvent(userId, eventType, details).catch(console.error);
  };

  const logSecurityEvent = (eventType: SecurityEventType, details: Partial<SecurityEvent> = {}) => {
    SecurityLogger.logSecurityEvent(details.userId || null, eventType, details).catch(console.error);
  };

  const logHealthDataAccess = async (eventType: HealthDataEventType, details: any = {}) => {
    const userId = details.userId || 'anonymous';
    return await SecurityLogger.logHealthDataAccess(userId, eventType, details);
  };

  return {
    logAuthEvent,
    logSecurityEvent,
    logHealthDataAccess,
    logVideoSessionEvent: SecurityLogger.logVideoSessionEvent,
    logApiAccess: SecurityLogger.logApiAccess
  };
}