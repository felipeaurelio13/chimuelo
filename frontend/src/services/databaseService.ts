import { openDB, type IDBPDatabase } from 'idb';

// Database configuration
const DB_NAME = 'maxi-health-db';
const DB_VERSION = 1;

// Store names
export const STORES = {
  USERS: 'users',
  HEALTH_RECORDS: 'health_records',
  CHAT_HISTORY: 'chat_history',
  INSIGHTS: 'insights',
  SYNC_LOG: 'sync_log',
  SETTINGS: 'settings'
} as const;

// Data interfaces
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthRecord {
  id: string;
  userId: string;
  type: 'weight' | 'height' | 'temperature' | 'symptom' | 'medication' | 'vaccine' | 'milestone' | 'note';
  data: any;
  timestamp: Date;
  confidence: number;
  requiresAttention: boolean;
  notes?: string;
  tags: string[];
  metadata: {
    source: 'manual' | 'ai_extraction' | 'import';
    inputType?: 'text' | 'image' | 'audio' | 'video' | 'pdf';
    originalInput?: string;
    location?: GeolocationCoordinates;
    context?: string;
  };
  encrypted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  context?: {
    relatedRecords: string[];
    searchResults?: any[];
    confidence?: number;
  };
  timestamp: Date;
  tokens?: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Insight {
  id: string;
  userId: string;
  type: 'pattern' | 'correlation' | 'prediction' | 'alert' | 'recommendation';
  title: string;
  description: string;
  data: any;
  confidence: number;
  urgency: 1 | 2 | 3 | 4 | 5;
  isRead: boolean;
  isResolved: boolean;
  relatedRecords: string[];
  createdAt: Date;
  expiresAt?: Date;
}

export interface SyncLogEntry {
  id: string;
  userId: string;
  operation: 'backup' | 'restore' | 'sync';
  status: 'pending' | 'success' | 'error';
  timestamp: Date;
  details: {
    recordsCount?: number;
    error?: string;
    checksum?: string;
  };
}

export interface AppSettings {
  id: string;
  userId: string;
  preferences: {
    units: {
      weight: 'kg' | 'lb';
      height: 'cm' | 'in';
      temperature: 'celsius' | 'fahrenheit';
    };
    notifications: {
      enabled: boolean;
      predictiveAlerts: boolean;
      reminderFrequency: number;
    };
    ui: {
      theme: 'light' | 'dark' | 'auto';
      babyMode: boolean;
      autoNightMode: boolean;
    };
    privacy: {
      encryptionEnabled: boolean;
      autoBackup: boolean;
      shareWithPediatrician: boolean;
    };
  };
  updatedAt: Date;
}

// Database service class
class DatabaseService {
  private db: IDBPDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.init();
  }

  // Initialize database
  private async init(): Promise<void> {
    try {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion) {
          console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);

          // Users store
          if (!db.objectStoreNames.contains(STORES.USERS)) {
            const userStore = db.createObjectStore(STORES.USERS, { keyPath: 'id' });
            userStore.createIndex('email', 'email', { unique: true });
            userStore.createIndex('createdAt', 'createdAt');
          }

          // Health records store
          if (!db.objectStoreNames.contains(STORES.HEALTH_RECORDS)) {
            const recordStore = db.createObjectStore(STORES.HEALTH_RECORDS, { keyPath: 'id' });
            recordStore.createIndex('userId', 'userId');
            recordStore.createIndex('type', 'type');
            recordStore.createIndex('timestamp', 'timestamp');
            recordStore.createIndex('requiresAttention', 'requiresAttention');
            recordStore.createIndex('tags', 'tags', { multiEntry: true });
            recordStore.createIndex('userType', ['userId', 'type']);
            recordStore.createIndex('userTimestamp', ['userId', 'timestamp']);
          }

          // Chat history store
          if (!db.objectStoreNames.contains(STORES.CHAT_HISTORY)) {
            const chatStore = db.createObjectStore(STORES.CHAT_HISTORY, { keyPath: 'id' });
            chatStore.createIndex('userId', 'userId');
            chatStore.createIndex('createdAt', 'createdAt');
          }

          // Insights store
          if (!db.objectStoreNames.contains(STORES.INSIGHTS)) {
            const insightStore = db.createObjectStore(STORES.INSIGHTS, { keyPath: 'id' });
            insightStore.createIndex('userId', 'userId');
            insightStore.createIndex('type', 'type');
            insightStore.createIndex('urgency', 'urgency');
            insightStore.createIndex('isRead', 'isRead');
            insightStore.createIndex('isResolved', 'isResolved');
            insightStore.createIndex('createdAt', 'createdAt');
            insightStore.createIndex('userUrgency', ['userId', 'urgency']);
          }

          // Sync log store
          if (!db.objectStoreNames.contains(STORES.SYNC_LOG)) {
            const syncStore = db.createObjectStore(STORES.SYNC_LOG, { keyPath: 'id' });
            syncStore.createIndex('userId', 'userId');
            syncStore.createIndex('operation', 'operation');
            syncStore.createIndex('status', 'status');
            syncStore.createIndex('timestamp', 'timestamp');
          }

          // Settings store
          if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
            const settingsStore = db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
            settingsStore.createIndex('userId', 'userId', { unique: true });
          }
        },
        blocked() {
          console.warn('Database upgrade blocked by another tab');
        },
        blocking() {
          console.warn('Database blocking other tabs');
        }
      });

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  // Ensure database is ready
  private async ensureReady(): Promise<IDBPDatabase> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return this.db;
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // CRUD Operations for Health Records
  async createHealthRecord(record: Omit<HealthRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<HealthRecord> {
    const db = await this.ensureReady();
    
    const newRecord: HealthRecord = {
      ...record,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.add(STORES.HEALTH_RECORDS, newRecord);
    return newRecord;
  }

  async getHealthRecord(id: string): Promise<HealthRecord | undefined> {
    const db = await this.ensureReady();
    return await db.get(STORES.HEALTH_RECORDS, id);
  }

  async updateHealthRecord(id: string, updates: Partial<HealthRecord>): Promise<HealthRecord> {
    const db = await this.ensureReady();
    const existing = await this.getHealthRecord(id);
    
    if (!existing) {
      throw new Error(`Health record with id ${id} not found`);
    }

    const updated: HealthRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };

    await db.put(STORES.HEALTH_RECORDS, updated);
    return updated;
  }

  async deleteHealthRecord(id: string): Promise<void> {
    const db = await this.ensureReady();
    await db.delete(STORES.HEALTH_RECORDS, id);
  }

  // Query health records with filters
  async getHealthRecords(
    userId: string,
    filters?: {
      type?: string;
      startDate?: Date;
      endDate?: Date;
      requiresAttention?: boolean;
      tags?: string[];
      limit?: number;
      offset?: number;
    }
  ): Promise<HealthRecord[]> {
    const db = await this.ensureReady();
    const transaction = db.transaction(STORES.HEALTH_RECORDS, 'readonly');
    const store = transaction.objectStore(STORES.HEALTH_RECORDS);
    
    let cursor;
    if (filters?.type) {
      cursor = await store.index('userType').openCursor([userId, filters.type]);
    } else {
      cursor = await store.index('userId').openCursor(userId);
    }
    
    const records: HealthRecord[] = [];
    
    while (cursor) {
      const record = cursor.value;
      
      // Apply filters
      let includeRecord = true;
      
      if (filters?.startDate && record.timestamp < filters.startDate) {
        includeRecord = false;
      }
      
      if (filters?.endDate && record.timestamp > filters.endDate) {
        includeRecord = false;
      }
      
      if (filters?.requiresAttention !== undefined && record.requiresAttention !== filters.requiresAttention) {
        includeRecord = false;
      }
      
      if (filters?.tags && !filters.tags.some(tag => record.tags.includes(tag))) {
        includeRecord = false;
      }
      
      if (includeRecord) {
        records.push(record);
      }
      
      // Check limits
      if (filters?.limit && records.length >= filters.limit) {
        break;
      }
      
      cursor = await cursor.continue();
    }
    
    // Sort by timestamp (newest first)
    records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply offset
    if (filters?.offset) {
      return records.slice(filters.offset);
    }
    
    return records;
  }

  // Get health records timeline
  async getHealthTimeline(
    userId: string,
    options?: {
      limit?: number;
      groupByDay?: boolean;
    }
  ): Promise<HealthRecord[]> {
    const db = await this.ensureReady();
    const transaction = db.transaction(STORES.HEALTH_RECORDS, 'readonly');
    const store = transaction.objectStore(STORES.HEALTH_RECORDS);
    
    const records: HealthRecord[] = [];
    let cursor = await store.index('userTimestamp').openCursor(
      IDBKeyRange.bound([userId, new Date(0)], [userId, new Date()]),
      'prev' // Start from most recent
    );
    
    while (cursor && (!options?.limit || records.length < options.limit)) {
      records.push(cursor.value);
      cursor = await cursor.continue();
    }
    
    return records;
  }

  // Chat operations
  async createChatSession(session: Omit<ChatSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChatSession> {
    const db = await this.ensureReady();
    
    const newSession: ChatSession = {
      ...session,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.add(STORES.CHAT_HISTORY, newSession);
    return newSession;
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    const db = await this.ensureReady();
    return await db.get(STORES.CHAT_HISTORY, id);
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession> {
    const db = await this.ensureReady();
    const existing = await this.getChatSession(id);
    
    if (!existing) {
      throw new Error(`Chat session with id ${id} not found`);
    }

    const updated: ChatSession = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };

    await db.put(STORES.CHAT_HISTORY, updated);
    return updated;
  }

  async getChatSessions(userId: string, limit = 50): Promise<ChatSession[]> {
    const db = await this.ensureReady();
    const transaction = db.transaction(STORES.CHAT_HISTORY, 'readonly');
    const store = transaction.objectStore(STORES.CHAT_HISTORY);
    
    const sessions: ChatSession[] = [];
    let cursor = await store.index('userId').openCursor(userId);
    
    while (cursor && sessions.length < limit) {
      sessions.push(cursor.value);
      cursor = await cursor.continue();
    }
    
    // Sort by most recent
    return sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Insights operations
  async createInsight(insight: Omit<Insight, 'id' | 'createdAt'>): Promise<Insight> {
    const db = await this.ensureReady();
    
    const newInsight: Insight = {
      ...insight,
      id: this.generateId(),
      createdAt: new Date()
    };

    await db.add(STORES.INSIGHTS, newInsight);
    return newInsight;
  }

  async getInsights(
    userId: string,
    filters?: {
      type?: string;
      urgency?: number;
      isRead?: boolean;
      isResolved?: boolean;
      limit?: number;
    }
  ): Promise<Insight[]> {
    const db = await this.ensureReady();
    const transaction = db.transaction(STORES.INSIGHTS, 'readonly');
    const store = transaction.objectStore(STORES.INSIGHTS);
    
    const insights: Insight[] = [];
    let cursor = await store.index('userId').openCursor(userId);
    
    while (cursor && (!filters?.limit || insights.length < filters.limit)) {
      const insight = cursor.value;
      
      // Apply filters
      let includeInsight = true;
      
      if (filters?.type && insight.type !== filters.type) includeInsight = false;
      if (filters?.urgency && insight.urgency !== filters.urgency) includeInsight = false;
      if (filters?.isRead !== undefined && insight.isRead !== filters.isRead) includeInsight = false;
      if (filters?.isResolved !== undefined && insight.isResolved !== filters.isResolved) includeInsight = false;
      
      // Check if expired
      if (insight.expiresAt && insight.expiresAt < new Date()) {
        includeInsight = false;
      }
      
      if (includeInsight) {
        insights.push(insight);
      }
      
      cursor = await cursor.continue();
    }
    
    // Sort by urgency and creation date
    return insights.sort((a, b) => {
      if (a.urgency !== b.urgency) return b.urgency - a.urgency;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  async markInsightAsRead(id: string): Promise<void> {
    const db = await this.ensureReady();
    const insight = await db.get(STORES.INSIGHTS, id);
    
    if (insight) {
      insight.isRead = true;
      await db.put(STORES.INSIGHTS, insight);
    }
  }

  async resolveInsight(id: string): Promise<void> {
    const db = await this.ensureReady();
    const insight = await db.get(STORES.INSIGHTS, id);
    
    if (insight) {
      insight.isResolved = true;
      await db.put(STORES.INSIGHTS, insight);
    }
  }

  // Settings operations
  async getSettings(userId: string): Promise<AppSettings | undefined> {
    const db = await this.ensureReady();
    const transaction = db.transaction(STORES.SETTINGS, 'readonly');
    const store = transaction.objectStore(STORES.SETTINGS);
    
    let cursor = await store.index('userId').openCursor(userId);
    return cursor?.value;
  }

  async updateSettings(userId: string, preferences: Partial<AppSettings['preferences']>): Promise<AppSettings> {
    const db = await this.ensureReady();
    const existing = await this.getSettings(userId);
    
    const settings: AppSettings = existing ? {
      ...existing,
      preferences: { ...existing.preferences, ...preferences },
      updatedAt: new Date()
    } : {
      id: this.generateId(),
      userId,
      preferences: {
        units: { weight: 'kg', height: 'cm', temperature: 'celsius', ...preferences.units },
        notifications: { enabled: true, predictiveAlerts: true, reminderFrequency: 24, ...preferences.notifications },
        ui: { theme: 'auto', babyMode: false, autoNightMode: true, ...preferences.ui },
        privacy: { encryptionEnabled: true, autoBackup: true, shareWithPediatrician: false, ...preferences.privacy },
        ...preferences
      },
      updatedAt: new Date()
    };

    await db.put(STORES.SETTINGS, settings);
    return settings;
  }

  // Analytics and stats
  async getHealthStats(userId: string): Promise<{
    totalRecords: number;
    recordsByType: Record<string, number>;
    alertsCount: number;
    lastRecord?: HealthRecord;
    trendData: { date: string; count: number }[];
  }> {
    const db = await this.ensureReady();
    db.transaction([STORES.HEALTH_RECORDS, STORES.INSIGHTS], 'readonly');
    
    // Get all health records
    const records = await this.getHealthRecords(userId);
    
    // Get alerts count
    const alerts = await this.getInsights(userId, { isResolved: false });
    
    // Calculate stats
    const recordsByType: Record<string, number> = {};
    records.forEach(record => {
      recordsByType[record.type] = (recordsByType[record.type] || 0) + 1;
    });
    
    // Generate trend data (last 30 days)
    const trendData: { date: string; count: number }[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const count = records.filter(record => 
        record.timestamp.toISOString().split('T')[0] === dateStr
      ).length;
      
      trendData.unshift({ date: dateStr, count });
    }
    
    return {
      totalRecords: records.length,
      recordsByType,
      alertsCount: alerts.length,
      lastRecord: records[0],
      trendData
    };
  }

  // Cleanup and maintenance
  async cleanupExpiredData(): Promise<void> {
    const db = await this.ensureReady();
    const transaction = db.transaction([STORES.INSIGHTS, STORES.SYNC_LOG], 'readwrite');
    
    // Remove expired insights
    const insightStore = transaction.objectStore(STORES.INSIGHTS);
    let insightCursor = await insightStore.openCursor();
    
    while (insightCursor) {
      const insight = insightCursor.value;
      if (insight.expiresAt && insight.expiresAt < new Date()) {
        await insightCursor.delete();
      }
      insightCursor = await insightCursor.continue();
    }
    
    // Remove old sync logs (keep only last 100)
    const syncStore = transaction.objectStore(STORES.SYNC_LOG);
    const allSyncLogs = await syncStore.getAll();
    allSyncLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (allSyncLogs.length > 100) {
      const toDelete = allSyncLogs.slice(100);
      for (const log of toDelete) {
        await syncStore.delete(log.id);
      }
    }
    
    await transaction.done;
  }

  // Database info and health
  async getDatabaseInfo(): Promise<{
    version: number;
    size: number;
    stores: string[];
    recordCounts: Record<string, number>;
  }> {
    const db = await this.ensureReady();
    
    const stores = Array.from(db.objectStoreNames);
    const recordCounts: Record<string, number> = {};
    
    for (const storeName of stores) {
      const count = await db.count(storeName);
      recordCounts[storeName] = count;
    }
    
    return {
      version: db.version,
      size: 0, // IndexedDB doesn't provide size directly
      stores,
      recordCounts
    };
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
export default databaseService;