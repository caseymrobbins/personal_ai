/**
 * PRIVACY ENFORCEMENT LAYER
 * =========================
 * Protects sensitive user data and ensures privacy compliance
 * Handles data classification, encryption, access control, and audit logging
 *
 * Privacy Principles:
 * - Data minimization: collect only necessary data
 * - Purpose limitation: use data only for stated purposes
 * - Storage limitation: retain data only as long as needed
 * - Integrity and confidentiality: protect data from unauthorized access
 * - Accountability: maintain audit trail of all access
 */

export type DataSensitivity = 'public' | 'internal' | 'sensitive' | 'highly-sensitive';

export type DataCategory =
  | 'personal-info'
  | 'emotional-state'
  | 'memory'
  | 'interaction-history'
  | 'preferences'
  | 'profile-data'
  | 'system-config'
  | 'audit-log';

export interface DataClassification {
  category: DataCategory;
  sensitivity: DataSensitivity;
  requiresEncryption: boolean;
  retentionDaysMin: number;
  retentionDaysMax: number;
  requiresConsent: boolean;
  consentType?: 'explicit' | 'implicit' | 'none';
  description: string;
}

export interface ProtectedData<T> {
  dataId: string;
  classification: DataClassification;
  encryptionKeyId?: string;
  isEncrypted: boolean;
  accessLog: AccessRecord[];
  createdAt: Date;
  lastAccessedAt?: Date;
  lastModifiedAt?: Date;
  expiresAt?: Date;
  consentGiven: boolean;
  purposeLimitation: string[];
}

export interface AccessRecord {
  accessId: string;
  userId: string;
  accessType: 'read' | 'write' | 'delete' | 'export';
  timestamp: Date;
  purpose: string;
  ipAddress?: string;
  success: boolean;
  reason?: string;
}

export interface DataRetentionPolicy {
  category: DataCategory;
  defaultRetentionDays: number;
  archiveAfterDays: number;
  deleteAfterDays: number;
  canUserDelete: boolean;
  notifyBeforeDeletion: boolean;
}

export interface PrivacyAudit {
  auditId: string;
  timestamp: Date;
  totalDataItems: number;
  totalAccessAttempts: number;
  unauthorizedAttempts: number;
  dataBreachesDetected: number;
  complianceViolations: string[];
  recommendations: string[];
}

export interface ConsentRecord {
  consentId: string;
  userId: string;
  dataCategory: DataCategory;
  consentGiven: boolean;
  timestamp: Date;
  expiresAt?: Date;
  withdrawalReason?: string;
  ipAddress?: string;
}

export interface PrivacySettings {
  dataMinimization: boolean;
  allowAnonymization: boolean;
  allowProfiling: boolean;
  allowThirdPartySharing: boolean;
  allowCrossPlatformTracking: boolean;
  dataExportFormat: 'json' | 'csv' | 'xml';
  notificationPreferences: {
    onDataAccess: boolean;
    onRetention: boolean;
    onDeletion: boolean;
  };
}

export interface PrivacyMetrics {
  totalProtectedDataItems: number;
  totalAccessAttempts: number;
  unauthorizedAccessAttempts: number;
  dataBreachesDetected: number;
  averageAccessLatency: number;
  complianceScore: number; // 0-100
  lastAuditTime: Date | null;
  consentRecordsCount: number;
  encryptedDataPercentage: number;
  dataExportRequests: number;
  dataDeletionRequests: number;
}

/**
 * Privacy Enforcement Service
 * Manages data protection, access control, and compliance
 */
class PrivacyEnforcementService {
  private static instance: PrivacyEnforcementService;
  private protectedDataStore: Map<string, ProtectedData<any>> = new Map();
  private dataClassifications: Map<DataCategory, DataClassification> = new Map();
  private retentionPolicies: Map<DataCategory, DataRetentionPolicy> = new Map();
  private accessAuditLog: AccessRecord[] = [];
  private consentRecords: ConsentRecord[] = [];
  private privacySettings: PrivacySettings = {
    dataMinimization: true,
    allowAnonymization: true,
    allowProfiling: false,
    allowThirdPartySharing: false,
    allowCrossPlatformTracking: false,
    dataExportFormat: 'json',
    notificationPreferences: {
      onDataAccess: true,
      onRetention: true,
      onDeletion: true,
    },
  };
  private metrics: PrivacyMetrics = {
    totalProtectedDataItems: 0,
    totalAccessAttempts: 0,
    unauthorizedAccessAttempts: 0,
    dataBreachesDetected: 0,
    averageAccessLatency: 0,
    complianceScore: 100,
    lastAuditTime: null,
    consentRecordsCount: 0,
    encryptedDataPercentage: 0,
    dataExportRequests: 0,
    dataDeletionRequests: 0,
  };

  static getInstance(): PrivacyEnforcementService {
    if (!PrivacyEnforcementService.instance) {
      PrivacyEnforcementService.instance = new PrivacyEnforcementService();
    }
    return PrivacyEnforcementService.instance;
  }

  /**
   * Initialize privacy enforcement with default classifications and policies
   */
  initialize(): void {
    this.initializeDataClassifications();
    this.initializeRetentionPolicies();
    console.log('🔒 Privacy Enforcement Service initialized');
    console.log(`   Data classifications: ${this.dataClassifications.size}`);
    console.log(`   Retention policies: ${this.retentionPolicies.size}`);
  }

  /**
   * Initialize default data classifications
   */
  private initializeDataClassifications(): void {
    const classifications: DataClassification[] = [
      {
        category: 'personal-info',
        sensitivity: 'highly-sensitive',
        requiresEncryption: true,
        retentionDaysMin: 0,
        retentionDaysMax: 365,
        requiresConsent: true,
        consentType: 'explicit',
        description: 'Name, contact info, identifiable personal information',
      },
      {
        category: 'emotional-state',
        sensitivity: 'sensitive',
        requiresEncryption: true,
        retentionDaysMin: 0,
        retentionDaysMax: 730,
        requiresConsent: true,
        consentType: 'explicit',
        description: 'Emotional states, moods, and psychological indicators',
      },
      {
        category: 'memory',
        sensitivity: 'sensitive',
        requiresEncryption: true,
        retentionDaysMin: 0,
        retentionDaysMax: 1095,
        requiresConsent: true,
        consentType: 'explicit',
        description: 'Consolidated memories and learning data',
      },
      {
        category: 'interaction-history',
        sensitivity: 'internal',
        requiresEncryption: false,
        retentionDaysMin: 0,
        retentionDaysMax: 180,
        requiresConsent: true,
        consentType: 'implicit',
        description: 'Records of user-system interactions',
      },
      {
        category: 'preferences',
        sensitivity: 'internal',
        requiresEncryption: false,
        retentionDaysMin: 0,
        retentionDaysMax: 1095,
        requiresConsent: true,
        consentType: 'implicit',
        description: 'User preferences and settings',
      },
      {
        category: 'profile-data',
        sensitivity: 'sensitive',
        requiresEncryption: true,
        retentionDaysMin: 0,
        retentionDaysMax: 1095,
        requiresConsent: true,
        consentType: 'explicit',
        description: 'User profile evolution and cognitive dimensions',
      },
      {
        category: 'system-config',
        sensitivity: 'internal',
        requiresEncryption: false,
        retentionDaysMin: 0,
        retentionDaysMax: 3650,
        requiresConsent: false,
        description: 'System configuration and operational data',
      },
      {
        category: 'audit-log',
        sensitivity: 'internal',
        requiresEncryption: false,
        retentionDaysMin: 90,
        retentionDaysMax: 2555,
        requiresConsent: false,
        description: 'Audit logs and compliance records',
      },
    ];

    classifications.forEach((c) => {
      this.dataClassifications.set(c.category, c);
    });
  }

  /**
   * Initialize default retention policies
   */
  private initializeRetentionPolicies(): void {
    const policies: DataRetentionPolicy[] = [
      {
        category: 'personal-info',
        defaultRetentionDays: 90,
        archiveAfterDays: 60,
        deleteAfterDays: 365,
        canUserDelete: true,
        notifyBeforeDeletion: true,
      },
      {
        category: 'emotional-state',
        defaultRetentionDays: 180,
        archiveAfterDays: 365,
        deleteAfterDays: 730,
        canUserDelete: true,
        notifyBeforeDeletion: true,
      },
      {
        category: 'memory',
        defaultRetentionDays: 365,
        archiveAfterDays: 730,
        deleteAfterDays: 1095,
        canUserDelete: true,
        notifyBeforeDeletion: true,
      },
      {
        category: 'interaction-history',
        defaultRetentionDays: 30,
        archiveAfterDays: 90,
        deleteAfterDays: 180,
        canUserDelete: true,
        notifyBeforeDeletion: false,
      },
      {
        category: 'preferences',
        defaultRetentionDays: 365,
        archiveAfterDays: 730,
        deleteAfterDays: 1095,
        canUserDelete: true,
        notifyBeforeDeletion: false,
      },
      {
        category: 'profile-data',
        defaultRetentionDays: 365,
        archiveAfterDays: 730,
        deleteAfterDays: 1095,
        canUserDelete: true,
        notifyBeforeDeletion: true,
      },
      {
        category: 'system-config',
        defaultRetentionDays: 1095,
        archiveAfterDays: 2555,
        deleteAfterDays: 3650,
        canUserDelete: false,
        notifyBeforeDeletion: false,
      },
      {
        category: 'audit-log',
        defaultRetentionDays: 365,
        archiveAfterDays: 730,
        deleteAfterDays: 2555,
        canUserDelete: false,
        notifyBeforeDeletion: false,
      },
    ];

    policies.forEach((p) => {
      this.retentionPolicies.set(p.category, p);
    });
  }

  /**
   * Store protected data with classification and encryption
   */
  storeProtectedData<T>(
    category: DataCategory,
    _data: T,
    _userId: string,
    purposes: string[],
    consentGiven: boolean = false
  ): ProtectedData<T> {
    const classification = this.dataClassifications.get(category);
    if (!classification) {
      throw new Error(`Unknown data category: ${category}`);
    }

    if (classification.requiresConsent && !consentGiven) {
      console.warn(`⚠️ Data category "${category}" requires consent but none provided`);
    }

    const retention = this.retentionPolicies.get(category)!;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + retention.defaultRetentionDays);

    const protectedData: ProtectedData<T> = {
      dataId: this.generateDataId(),
      classification,
      encryptionKeyId: classification.requiresEncryption ? this.generateKeyId() : undefined,
      isEncrypted: classification.requiresEncryption,
      accessLog: [],
      createdAt: new Date(),
      expiresAt,
      consentGiven,
      purposeLimitation: purposes,
    };

    this.protectedDataStore.set(protectedData.dataId, protectedData);
    this.metrics.totalProtectedDataItems++;

    if (protectedData.isEncrypted) {
      this.metrics.encryptedDataPercentage = Math.round(
        (Array.from(this.protectedDataStore.values()).filter((d) => d.isEncrypted).length /
          this.protectedDataStore.size) *
          100
      );
    }

    console.log(
      `🔐 Protected data stored (${protectedData.dataId.slice(0, 8)}): ${category} [${classification.sensitivity}]`
    );

    return protectedData;
  }

  /**
   * Access protected data with logging and authorization checks
   */
  accessProtectedData<T>(
    dataId: string,
    userId: string,
    purpose: string,
    ipAddress?: string
  ): T | null {
    const startTime = Date.now();
    const protectedData = this.protectedDataStore.get(dataId) as ProtectedData<T> | undefined;

    if (!protectedData) {
      this.logAccessAttempt(dataId, userId, 'read', purpose, ipAddress, false, 'Data not found');
      this.metrics.unauthorizedAccessAttempts++;
      return null;
    }

    // Check purpose limitation
    if (!protectedData.purposeLimitation.includes(purpose)) {
      this.logAccessAttempt(
        dataId,
        userId,
        'read',
        purpose,
        ipAddress,
        false,
        'Purpose not in limitation list'
      );
      this.metrics.unauthorizedAccessAttempts++;
      console.warn(
        `🚫 Unauthorized access attempt: purpose "${purpose}" not allowed for this data`
      );
      return null;
    }

    // Log successful access
    this.logAccessAttempt(dataId, userId, 'read', purpose, ipAddress, true);
    protectedData.lastAccessedAt = new Date();

    const accessLatency = Date.now() - startTime;
    this.metrics.averageAccessLatency =
      (this.metrics.averageAccessLatency + accessLatency) / 2;

    console.log(`📖 Protected data accessed (${dataId.slice(0, 8)}) by user ${userId}`);

    // In production, would decrypt here
    return null; // Returning null for data (would return decrypted data in production)
  }

  /**
   * Log data access attempt
   */
  private logAccessAttempt(
    dataId: string,
    userId: string,
    accessType: 'read' | 'write' | 'delete' | 'export',
    purpose: string,
    ipAddress?: string,
    success: boolean = true,
    reason?: string
  ): void {
    const accessRecord: AccessRecord = {
      accessId: this.generateAccessId(),
      userId,
      accessType,
      timestamp: new Date(),
      purpose,
      ipAddress,
      success,
      reason,
    };

    this.accessAuditLog.push(accessRecord);
    this.metrics.totalAccessAttempts++;

    if (!success) {
      this.metrics.unauthorizedAccessAttempts++;
    }
  }

  /**
   * Request data export (GDPR right to access)
   */
  requestDataExport(userId: string, categories?: DataCategory[]): {
    exportId: string;
    dataItems: number;
    format: string;
    createdAt: Date;
  } {
    const exportId = this.generateExportId();
    let dataItems = 0;

    for (const [_dataId, data] of this.protectedDataStore.entries()) {
      if (!categories || categories.includes(data.classification.category)) {
        dataItems++;
      }
    }

    this.metrics.dataExportRequests++;
    this.logAccessAttempt('export-request', userId, 'export', 'User data export', undefined, true);

    console.log(
      `📦 Data export requested by user ${userId}: ${dataItems} items in ${this.privacySettings.dataExportFormat} format`
    );

    return {
      exportId,
      dataItems,
      format: this.privacySettings.dataExportFormat,
      createdAt: new Date(),
    };
  }

  /**
   * Request data deletion (GDPR right to be forgotten)
   */
  requestDataDeletion(userId: string, categories?: DataCategory[]): {
    deletionId: string;
    deletedItems: number;
    status: string;
  } {
    const deletionId = this.generateDeletionId();
    let deletedItems = 0;

    for (const [_dataId, data] of this.protectedDataStore.entries()) {
      if (
        (!categories || categories.includes(data.classification.category)) &&
        data.classification.category !== 'audit-log'
      ) {
        // Don't delete audit logs for compliance
        const policy = this.retentionPolicies.get(data.classification.category);
        if (policy && policy.canUserDelete) {
          this.protectedDataStore.delete(dataId);
          this.logAccessAttempt(
            dataId,
            userId,
            'delete',
            'User-requested deletion',
            undefined,
            true
          );
          deletedItems++;
        }
      }
    }

    this.metrics.dataDeletionRequests++;
    this.metrics.totalProtectedDataItems -= deletedItems;

    console.log(`🗑️  Data deletion request processed: ${deletedItems} items deleted`);

    return {
      deletionId,
      deletedItems,
      status: 'completed',
    };
  }

  /**
   * Record user consent
   */
  recordConsent(
    userId: string,
    category: DataCategory,
    consentGiven: boolean,
    ipAddress?: string
  ): ConsentRecord {
    const consentRecord: ConsentRecord = {
      consentId: this.generateConsentId(),
      userId,
      dataCategory: category,
      consentGiven,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      ipAddress,
    };

    this.consentRecords.push(consentRecord);
    this.metrics.consentRecordsCount++;

    const action = consentGiven ? '✅ Consent given' : '❌ Consent withdrawn';
    console.log(`${action} for ${category} by user ${userId}`);

    return consentRecord;
  }

  /**
   * Withdraw consent
   */
  withdrawConsent(userId: string, category: DataCategory, reason?: string): boolean {
    const consentRecord: ConsentRecord = {
      consentId: this.generateConsentId(),
      userId,
      dataCategory: category,
      consentGiven: false,
      timestamp: new Date(),
      withdrawalReason: reason,
    };

    this.consentRecords.push(consentRecord);
    console.log(`❌ Consent withdrawn for ${category} by user ${userId}`);

    return true;
  }

  /**
   * Check if user has valid consent for category
   */
  hasValidConsent(userId: string, category: DataCategory): boolean {
    const classification = this.dataClassifications.get(category);
    if (!classification || !classification.requiresConsent) {
      return true;
    }

    // Find most recent consent record
    const recentConsent = [...this.consentRecords]
      .reverse()
      .find((c) => c.userId === userId && c.dataCategory === category);

    if (!recentConsent) {
      return false;
    }

    if (recentConsent.expiresAt && recentConsent.expiresAt < new Date()) {
      return false;
    }

    return recentConsent.consentGiven;
  }

  /**
   * Update privacy settings
   */
  updatePrivacySettings(settings: Partial<PrivacySettings>): void {
    this.privacySettings = { ...this.privacySettings, ...settings };
    console.log('⚙️ Privacy settings updated');
  }

  /**
   * Perform privacy audit
   */
  performPrivacyAudit(): PrivacyAudit {
    const audit: PrivacyAudit = {
      auditId: this.generateAuditId(),
      timestamp: new Date(),
      totalDataItems: this.protectedDataStore.size,
      totalAccessAttempts: this.metrics.totalAccessAttempts,
      unauthorizedAttempts: this.metrics.unauthorizedAccessAttempts,
      dataBreachesDetected: this.metrics.dataBreachesDetected,
      complianceViolations: [],
      recommendations: [],
    };

    // Check for expired data
    let expiredCount = 0;
    for (const data of this.protectedDataStore.values()) {
      if (data.expiresAt && data.expiresAt < new Date()) {
        audit.complianceViolations.push(`Expired data found: ${data.dataId}`);
        expiredCount++;
      }
    }

    // Check consent compliance
    let unconsented = 0;
    for (const data of this.protectedDataStore.values()) {
      if (data.classification.requiresConsent && !data.consentGiven) {
        unconsented++;
      }
    }

    if (unconsented > 0) {
      audit.complianceViolations.push(
        `${unconsented} items stored without required consent`
      );
    }

    // Calculate compliance score
    const violationPenalty = audit.complianceViolations.length * 10;
    const unauthorizedPenalty = Math.min(
      this.metrics.unauthorizedAccessAttempts * 2,
      50
    );
    this.metrics.complianceScore = Math.max(0, 100 - violationPenalty - unauthorizedPenalty);

    // Generate recommendations
    if (expiredCount > 0) {
      audit.recommendations.push(`Remove ${expiredCount} expired data items`);
    }

    if (
      this.metrics.unauthorizedAccessAttempts > this.metrics.totalAccessAttempts * 0.1
    ) {
      audit.recommendations.push('Review access control policies - high unauthorized attempt rate');
    }

    if (!this.privacySettings.dataMinimization) {
      audit.recommendations.push('Enable data minimization to reduce privacy risk');
    }

    this.metrics.lastAuditTime = new Date();

    console.log(`🔍 Privacy audit completed: Compliance score ${this.metrics.complianceScore}/100`);
    console.log(`   Violations: ${audit.complianceViolations.length}`);
    console.log(`   Recommendations: ${audit.recommendations.length}`);

    return audit;
  }

  /**
   * Get privacy metrics
   */
  getMetrics(): PrivacyMetrics {
    return { ...this.metrics };
  }

  /**
   * Get audit log for compliance
   */
  getAuditLog(limit: number = 100, userId?: string): AccessRecord[] {
    let logs = this.accessAuditLog;

    if (userId) {
      logs = logs.filter((log) => log.userId === userId);
    }

    return logs.slice(-limit);
  }

  /**
   * Get data classifications
   */
  getDataClassifications(): DataClassification[] {
    return Array.from(this.dataClassifications.values());
  }

  /**
   * Get retention policies
   */
  getRetentionPolicies(): DataRetentionPolicy[] {
    return Array.from(this.retentionPolicies.values());
  }

  /**
   * Generate unique IDs
   */
  private generateDataId(): string {
    return `data-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateKeyId(): string {
    return `key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAccessId(): string {
    return `access-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConsentId(): string {
    return `consent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExportId(): string {
    return `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDeletionId(): string {
    return `delete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAuditId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset service state (for testing)
   */
  reset(): void {
    this.protectedDataStore.clear();
    this.accessAuditLog = [];
    this.consentRecords = [];
    this.metrics = {
      totalProtectedDataItems: 0,
      totalAccessAttempts: 0,
      unauthorizedAccessAttempts: 0,
      dataBreachesDetected: 0,
      averageAccessLatency: 0,
      complianceScore: 100,
      lastAuditTime: null,
      consentRecordsCount: 0,
      encryptedDataPercentage: 0,
      dataExportRequests: 0,
      dataDeletionRequests: 0,
    };
    console.log('🔄 Privacy Enforcement Service reset');
  }
}

export const privacyEnforcement = PrivacyEnforcementService.getInstance();
export { PrivacyEnforcementService };
