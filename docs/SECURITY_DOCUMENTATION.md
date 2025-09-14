# FitWithPari Security Documentation

## Table of Contents
1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Health Data Security (HIPAA)](#health-data-security-hipaa)
4. [Video Session Security](#video-session-security)
5. [Data Protection](#data-protection)
6. [API Security](#api-security)
7. [Production Security](#production-security)
8. [Compliance Guidelines](#compliance-guidelines)
9. [Security Best Practices](#security-best-practices)
10. [Incident Response](#incident-response)

## Security Overview

FitWithPari implements comprehensive security measures to protect user data, health information, and ensure compliance with healthcare regulations including HIPAA, GDPR, and other applicable privacy laws.

### Security Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React/TS)    │    │   (Supabase)    │    │   (PostgreSQL)  │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • JWT Token     │    │ • RLS Policies  │    │ • Encryption    │
│ • Input Valid.  │    │ • Auth Service  │    │ • Audit Logs    │
│ • XSS Protection│    │ • Rate Limiting │    │ • Backups       │
│ • CSRF Tokens   │    │ • API Security  │    │ • Access Ctrl   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Security Layer │
                    ├─────────────────┤
                    │ • Audit Logging │
                    │ • Threat Detect │
                    │ • Encryption    │
                    │ • Access Ctrl   │
                    └─────────────────┘
```

### Security Modules

- **Authentication Context**: Role-based access control and session management
- **JWT Manager**: Secure token handling with auto-refresh
- **Health Data Security**: HIPAA-compliant data handling
- **Video Security**: Secure video session management
- **Input Validation**: XSS and injection prevention
- **Environment Security**: Secrets and configuration management
- **Production Security**: Hardening and monitoring

## Authentication & Authorization

### JWT Token Management

#### Token Structure
```typescript
interface JWTPayload {
  sub: string;        // User ID
  email: string;      // User email
  role: UserRole;     // User role (student, coach, admin)
  sessionId: string;  // Session identifier
  iat: number;        // Issued at
  exp: number;        // Expiration
  aud: string;        // Audience
  iss: string;        // Issuer
}
```

#### Token Security Features
- **Automatic Refresh**: Tokens refresh 5 minutes before expiration
- **Secure Storage**: Encrypted storage with integrity checks
- **Role-Based Permissions**: Fine-grained access control
- **Session Management**: Multi-device session handling

#### Usage Example
```typescript
import { useAuth } from '@/lib/security/auth-context';

function ProtectedComponent() {
  const { user, hasPermission, signOut } = useAuth();

  if (!hasPermission('fitness.view_student_data')) {
    return <div>Access denied</div>;
  }

  return <div>Protected content</div>;
}
```

### Role-Based Access Control (RBAC)

#### Roles and Permissions

**Student Role:**
- `fitness.view_own_data`
- `fitness.update_own_profile`
- `fitness.join_sessions`
- `health.view_own_considerations`

**Coach Role:**
- All student permissions plus:
- `fitness.manage_sessions`
- `fitness.view_student_data`
- `fitness.create_workouts`
- `health.view_student_health`
- `video.create_sessions`

**Admin Role:**
- All permissions plus:
- `fitness.manage_users`
- `fitness.system_settings`
- `fitness.audit_logs`

#### Permission Checking
```typescript
// Component-level protection
export const CoachOnlyComponent = withRoleProtection(
  MyComponent,
  ['coach', 'admin']
);

// Hook-based permission checking
function usePermissionGuard(permission: string) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    throw new Error('Insufficient permissions');
  }
}
```

## Health Data Security (HIPAA)

### Protected Health Information (PHI)

FitWithPari handles the following types of PHI:
- Medical conditions and history
- Medications and treatments
- Physical limitations and injuries
- Biometric data and measurements
- Emergency contact information

### Data Encryption

#### At Rest
- **Algorithm**: AES-256-GCM
- **Key Management**: User-specific derived keys
- **Integrity**: Checksums for tamper detection

```typescript
import { HealthDataSecurity } from '@/lib/security/health-data-security';

// Encrypt health data before storage
const { encryptedData, metadata } = await HealthDataSecurity.encryptHealthData(
  healthInfo,
  userId
);
```

#### In Transit
- **Protocol**: TLS 1.3 minimum
- **Certificate Pinning**: Production environments
- **Perfect Forward Secrecy**: Enabled

### Consent Management

#### Consent Types
- `data_collection`: Basic health data collection
- `data_sharing`: Sharing with coaches/trainers
- `third_party_integration`: Integration with fitness devices
- `research_participation`: Anonymous research data
- `video_recording`: Session recording consent

#### Consent Workflow
```typescript
// Request consent for health data processing
const consentId = await HealthDataSecurity.requestConsent(
  userId,
  'data_sharing',
  'Fitness coaching and progress tracking',
  ['health_considerations', 'fitness_assessments'],
  365 // expires in 365 days
);

// User grants consent
await HealthDataSecurity.grantConsent(consentId, userId);

// Check valid consent before processing
const hasConsent = await HealthDataSecurity.hasValidConsent(
  userId,
  'data_sharing',
  'fitness_coaching'
);
```

### Audit Logging

#### Audit Events
- Data access requests and grants
- Data modifications and deletions
- Consent grants and withdrawals
- Data exports and sharing
- Security violations

#### Audit Trail Example
```typescript
// Log health data access
const auditId = await SecurityLogger.logHealthDataAccess(
  accessorId,
  'DATA_VIEWED',
  {
    dataSubject: patientId,
    dataType: 'health_considerations',
    justification: 'Workout planning session'
  }
);

// Generate compliance report
const report = await SecurityLogger.generateComplianceReport(
  startDate,
  endDate
);
```

### Data Retention and Deletion

- **Default Retention**: 7 years (HIPAA requirement)
- **User Deletion Rights**: 30-day processing window
- **Automatic Cleanup**: Scheduled cleanup of expired data
- **Secure Deletion**: Cryptographic erasure of encryption keys

## Video Session Security

### Session Authentication

#### JWT-Based Access Tokens
```typescript
// Generate secure video session token
const videoToken = await VideoSecurity.generateParticipantToken(
  sessionId,
  userId,
  'participant'
);

// Token includes permissions and expiration
interface VideoAccessToken {
  token: string;
  sessionId: string;
  userId: string;
  role: 'host' | 'participant';
  permissions: string[];
  expiresAt: number;
}
```

### Session Security Features

#### Access Control
- **Participant Validation**: Pre-authorized participant lists
- **Waiting Room**: Host approval required
- **Session Passwords**: Optional password protection
- **Time-based Access**: Tokens expire automatically

#### Recording Security
- **Consent Required**: Explicit consent before recording
- **Encrypted Storage**: Recordings encrypted at rest
- **Access Logging**: All recording access logged
- **Retention Policies**: Automatic deletion after retention period

### Zoom SDK Integration

#### Secure Configuration
```typescript
// Generate Zoom SDK signature
const signature = await VideoSecurity.generateZoomSDKSignature(
  meetingNumber,
  role
);

// Initialize Zoom client with security
const zoomClient = ZoomVideo.createClient({
  enforceGalleryView: true,
  videoElement: videoElement,
  shareElement: shareElement,
  enforceVirtualBackground: true
});
```

#### Security Monitoring
- **Connection Monitoring**: Detect suspicious activity
- **Screen Sharing Control**: Restrict unauthorized sharing
- **Recording Detection**: Monitor for unauthorized recording
- **Participant Validation**: Continuous identity verification

## Data Protection

### Input Validation and Sanitization

#### Security Threats Detected
- SQL Injection attempts
- XSS attacks (Cross-Site Scripting)
- Path traversal attempts
- Command injection
- CSRF attacks

#### Validation Rules
```typescript
import { InputValidator } from '@/lib/security/input-validation';

// Validate user input with security checks
const result = InputValidator.validateField(
  'userComment',
  userInput,
  {
    required: true,
    maxLength: 500,
    sanitizer: (value) => DOMPurify.sanitize(value)
  },
  userId
);

if (result.securityThreats?.length > 0) {
  // Security threat detected - log and block
  console.warn('Security threat detected:', result.securityThreats);
}
```

### Rate Limiting

#### Global Rate Limits
- **General API**: 100 requests/minute per IP
- **Authentication**: 5 attempts/5 minutes per IP
- **Registration**: 3 attempts/10 minutes per IP
- **Health Data**: 10 requests/minute per user

#### Implementation
```typescript
// Apply rate limiting
const rateLimitResult = ProductionSecurity.applyRateLimit(
  '/api/auth/login',
  clientIP
);

if (!rateLimitResult.allowed) {
  return {
    error: 'Rate limit exceeded',
    resetTime: rateLimitResult.resetTime
  };
}
```

### File Upload Security

#### Allowed File Types
- Images: jpg, jpeg, png, gif
- Documents: pdf
- Videos: mp4, mov

#### Security Measures
- **File Type Validation**: Extension and MIME type checking
- **File Size Limits**: 10MB maximum per file
- **Filename Security**: Path traversal prevention
- **Virus Scanning**: Integration with antivirus services
- **Content Scanning**: Detect malicious content

## API Security

### Authentication Requirements

#### API Key Authentication
```http
Authorization: Bearer <jwt_token>
X-API-Key: <api_key>
X-Request-Signature: <hmac_signature>
```

#### Request Signing
```typescript
// Generate request signature
const signature = hmacSHA256(
  `${method}${url}${timestamp}${body}`,
  apiSecret
);
```

### Security Headers

#### Response Headers
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### API Versioning and Deprecation

#### Version Management
- **Current Version**: v2
- **Deprecated Versions**: v1 (sunset: 6 months)
- **Version Headers**: `API-Version: 2.0`
- **Backward Compatibility**: Maintained for 12 months

## Production Security

### Environment Security

#### Secret Management
```typescript
// Secure secret access
const dbPassword = EnvironmentSecurity.getSecret('databasePassword');

// Secret rotation
await EnvironmentSecurity.rotateSecret('apiKey', newApiKey);

// Environment validation
const validation = await EnvironmentSecurity.validateEnvironment();
if (!validation.isValid) {
  throw new Error('Environment security check failed');
}
```

#### Configuration Security
- **Secret Encryption**: Secrets encrypted at rest
- **Access Logging**: All secret access logged
- **Rotation Policies**: Automatic key rotation
- **Environment Separation**: Strict dev/staging/prod separation

### Monitoring and Alerting

#### Security Events Monitored
- Authentication failures
- Authorization violations
- Data access anomalies
- API abuse patterns
- System intrusion attempts

#### Alert Configuration
```typescript
const alertThresholds = {
  failedLogins: 5,        // 5 failed logins in 15 minutes
  apiErrors: 10,          // 10 API errors in 5 minutes
  securityViolations: 1,  // Immediate alert
  dataBreachAttempts: 1   // Immediate critical alert
};
```

### Infrastructure Security

#### Network Security
- **WAF (Web Application Firewall)**: CloudFlare protection
- **DDoS Protection**: Rate limiting and traffic filtering
- **SSL/TLS**: TLS 1.3 minimum, perfect forward secrecy
- **Certificate Management**: Automated renewal and monitoring

#### Database Security
- **Connection Encryption**: SSL/TLS for all connections
- **Row Level Security**: Supabase RLS policies
- **Query Monitoring**: Slow query detection and alerting
- **Backup Encryption**: All backups encrypted

## Compliance Guidelines

### HIPAA Compliance

#### Administrative Safeguards
- **Security Officer**: Designated security responsible person
- **Workforce Training**: Regular security training programs
- **Access Management**: Role-based access controls
- **Incident Response**: Documented breach notification procedures

#### Physical Safeguards
- **Facility Access**: Controlled access to data centers
- **Workstation Security**: Secured development environments
- **Device Controls**: Mobile device management policies
- **Media Disposal**: Secure disposal of storage media

#### Technical Safeguards
- **Access Control**: Unique user identification and authentication
- **Audit Controls**: Comprehensive logging and monitoring
- **Integrity**: Data integrity verification and checksums
- **Transmission Security**: End-to-end encryption

### GDPR Compliance

#### Data Subject Rights
- **Right to Access**: Data portability and access requests
- **Right to Rectification**: Data correction capabilities
- **Right to Erasure**: Account deletion and data removal
- **Right to Portability**: Data export functionality

#### Privacy by Design
- **Data Minimization**: Collect only necessary data
- **Purpose Limitation**: Use data only for stated purposes
- **Storage Limitation**: Automatic data retention policies
- **Transparency**: Clear privacy notices and consent forms

### SOC 2 Type II Compliance

#### Security Controls
- **Access Controls**: Multi-factor authentication
- **Change Management**: Controlled deployment processes
- **System Monitoring**: 24/7 monitoring and alerting
- **Vendor Management**: Third-party security assessments

## Security Best Practices

### Development Security

#### Secure Coding Practices
1. **Input Validation**: Validate all user inputs
2. **Output Encoding**: Encode all outputs to prevent XSS
3. **SQL Injection Prevention**: Use parameterized queries
4. **Authentication**: Implement proper session management
5. **Authorization**: Check permissions for every action

#### Code Review Security Checklist
- [ ] Input validation implemented
- [ ] SQL injection prevention
- [ ] XSS protection in place
- [ ] Authentication checks
- [ ] Authorization verification
- [ ] Sensitive data handling
- [ ] Error handling (no information leakage)
- [ ] Logging and monitoring

### Deployment Security

#### Pre-Deployment Checklist
- [ ] Security scan completed
- [ ] Vulnerability assessment passed
- [ ] Environment security validated
- [ ] Secrets properly configured
- [ ] Monitoring enabled
- [ ] Backup procedures tested
- [ ] Incident response plan updated

#### Production Monitoring
- **Real-time Alerts**: Critical security events
- **Performance Monitoring**: API response times and errors
- **Log Analysis**: Automated threat detection
- **Health Checks**: System availability monitoring

### User Security Education

#### User Guidelines
1. **Strong Passwords**: Minimum 8 characters with complexity
2. **Two-Factor Authentication**: Enable when available
3. **Secure Sessions**: Always log out when finished
4. **Suspicious Activity**: Report unusual account activity
5. **Software Updates**: Keep browsers and apps updated

## Incident Response

### Security Incident Categories

#### Category 1: Low Risk
- **Examples**: Failed login attempts, minor configuration issues
- **Response Time**: 24 hours
- **Escalation**: Security team notification

#### Category 2: Medium Risk
- **Examples**: Suspicious user activity, minor data exposure
- **Response Time**: 4 hours
- **Escalation**: Management notification

#### Category 3: High Risk
- **Examples**: Data breach, system compromise, HIPAA violation
- **Response Time**: 1 hour
- **Escalation**: Executive team, legal, compliance

#### Category 4: Critical Risk
- **Examples**: Active attack, massive data breach, system down
- **Response Time**: 15 minutes
- **Escalation**: All hands on deck, external authorities

### Response Procedures

#### Immediate Response (0-15 minutes)
1. **Contain**: Isolate affected systems
2. **Assess**: Determine scope and impact
3. **Notify**: Alert response team
4. **Document**: Begin incident documentation

#### Short-term Response (15 minutes - 4 hours)
1. **Investigate**: Root cause analysis
2. **Mitigate**: Implement temporary fixes
3. **Communicate**: Notify stakeholders
4. **Evidence**: Preserve forensic evidence

#### Long-term Response (4 hours - 72 hours)
1. **Remediate**: Implement permanent fixes
2. **Notify**: Regulatory and legal notifications
3. **Review**: Post-incident analysis
4. **Improve**: Update security measures

### Communication Templates

#### Internal Notification
```
SECURITY INCIDENT ALERT
Severity: [High/Medium/Low]
Time: [Timestamp]
Affected Systems: [System names]
Impact: [Description]
Response Team: [Team members]
Actions Taken: [List actions]
Next Steps: [Planned actions]
```

#### User Notification
```
Security Notice

We are writing to inform you of a security incident that may have
affected your account information. We take the security of your
personal information seriously and want to keep you informed.

What Happened: [Description]
Information Involved: [Data types]
Actions Taken: [Security measures]
What You Should Do: [User actions]
Contact Information: security@fitwithpari.com
```

### Legal and Regulatory Requirements

#### Breach Notification Timeline
- **HIPAA**: 60 days to HHS, 60 days to affected individuals
- **GDPR**: 72 hours to supervisory authority, without undue delay to individuals
- **State Laws**: Varies by state, typically 30-60 days

#### Documentation Requirements
- Incident timeline and actions taken
- Systems and data affected
- Number of individuals affected
- Risk assessment and impact analysis
- Mitigation and remediation measures

---

*This documentation is maintained by the FitWithPari Security Team and is reviewed quarterly or after significant security updates.*

**Last Updated**: [Current Date]
**Version**: 1.0
**Next Review**: [Review Date]

**Contact Information**:
- Security Team: security@fitwithpari.com
- Emergency Response: +1-XXX-XXX-XXXX
- Legal/Compliance: compliance@fitwithpari.com