import React, { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import databaseService, { type HealthRecord, type Insight, type ChatSession, type AppSettings } from '../services/databaseService';
import { useAuth } from './AuthContext';

// Context interfaces
interface HealthStats {
  totalRecords: number;
  recordsByType: Record<string, number>;
  alertsCount: number;
  lastRecord?: HealthRecord;
  trendData: { date: string; count: number }[];
}

interface DataState {
  // Health Records
  healthRecords: HealthRecord[];
  healthStats: HealthStats | null;
  
  // Insights & Alerts
  insights: Insight[];
  unreadInsights: number;
  urgentAlerts: Insight[];
  
  // Chat History
  chatSessions: ChatSession[];
  activeChatSession: ChatSession | null;
  
  // Settings
  settings: AppSettings | null;
  
  // Loading states
  isLoading: {
    records: boolean;
    insights: boolean;
    stats: boolean;
    chat: boolean;
  };
  
  // Errors
  errors: {
    records?: string;
    insights?: string;
    stats?: string;
    chat?: string;
  };
  
  // Cache timestamps
  lastFetch: {
    records?: Date;
    insights?: Date;
    stats?: Date;
    chat?: Date;
  };
}

type DataAction =
  | { type: 'SET_LOADING'; payload: { key: keyof DataState['isLoading']; value: boolean } }
  | { type: 'SET_ERROR'; payload: { key: keyof DataState['errors']; value?: string } }
  | { type: 'SET_HEALTH_RECORDS'; payload: HealthRecord[] }
  | { type: 'ADD_HEALTH_RECORD'; payload: HealthRecord }
  | { type: 'UPDATE_HEALTH_RECORD'; payload: { id: string; updates: Partial<HealthRecord> } }
  | { type: 'DELETE_HEALTH_RECORD'; payload: string }
  | { type: 'SET_HEALTH_STATS'; payload: HealthStats }
  | { type: 'SET_INSIGHTS'; payload: Insight[] }
  | { type: 'ADD_INSIGHT'; payload: Insight }
  | { type: 'UPDATE_INSIGHT'; payload: { id: string; updates: Partial<Insight> } }
  | { type: 'SET_CHAT_SESSIONS'; payload: ChatSession[] }
  | { type: 'SET_ACTIVE_CHAT_SESSION'; payload: ChatSession | null }
  | { type: 'UPDATE_CHAT_SESSION'; payload: { id: string; updates: Partial<ChatSession> } }
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'SET_LAST_FETCH'; payload: { key: keyof DataState['lastFetch']; value: Date } }
  | { type: 'RESET_DATA' };

interface DataContextType {
  // State
  state: DataState;
  
  // Health Records
  refreshHealthRecords: () => Promise<void>;
  createHealthRecord: (record: Omit<HealthRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<HealthRecord>;
  updateHealthRecord: (id: string, updates: Partial<HealthRecord>) => Promise<void>;
  deleteHealthRecord: (id: string) => Promise<void>;
  getHealthRecordsByType: (type: string) => HealthRecord[];
  getRecentHealthRecords: (days?: number) => HealthRecord[];
  
  // Insights & Alerts
  refreshInsights: () => Promise<void>;
  createInsight: (insight: Omit<Insight, 'id' | 'createdAt'>) => Promise<Insight>;
  markInsightAsRead: (id: string) => Promise<void>;
  resolveInsight: (id: string) => Promise<void>;
  getInsightsByUrgency: (urgency: number) => Insight[];
  getUnresolvedAlerts: () => Insight[];
  
  // Chat
  refreshChatSessions: () => Promise<void>;
  createChatSession: (title: string) => Promise<ChatSession>;
  updateChatSession: (id: string, updates: Partial<ChatSession>) => Promise<void>;
  setActiveChatSession: (session: ChatSession | null) => void;
  
  // Settings
  refreshSettings: () => Promise<void>;
  updateSettings: (preferences: Partial<AppSettings['preferences']>) => Promise<void>;
  
  // Stats
  refreshHealthStats: () => Promise<void>;
  
  // Smart context for AI
  getSmartContext: () => Promise<{
    childProfile: any;
    recentPatterns: any;
    environmentalFactors: any;
    parentalConcerns: any;
    medicalHistory: any;
  }>;
  
  // Utilities
  isDataStale: (key: keyof DataState['lastFetch'], maxAgeMs?: number) => boolean;
  refreshAllData: () => Promise<void>;
  exportData: () => Promise<Blob>;
  clearAllData: () => Promise<void>;
}

// Initial state
const initialState: DataState = {
  healthRecords: [],
  healthStats: null,
  insights: [],
  unreadInsights: 0,
  urgentAlerts: [],
  chatSessions: [],
  activeChatSession: null,
  settings: null,
  isLoading: {
    records: false,
    insights: false,
    stats: false,
    chat: false
  },
  errors: {},
  lastFetch: {}
};

// Reducer
function dataReducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: { ...state.isLoading, [action.payload.key]: action.payload.value }
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.payload.key]: action.payload.value }
      };
      
    case 'SET_HEALTH_RECORDS':
      return { ...state, healthRecords: action.payload };
      
    case 'ADD_HEALTH_RECORD':
      return { 
        ...state, 
        healthRecords: [action.payload, ...state.healthRecords]
      };
      
    case 'UPDATE_HEALTH_RECORD':
      return {
        ...state,
        healthRecords: state.healthRecords.map(record =>
          record.id === action.payload.id 
            ? { ...record, ...action.payload.updates, updatedAt: new Date() }
            : record
        )
      };
      
    case 'DELETE_HEALTH_RECORD':
      return {
        ...state,
        healthRecords: state.healthRecords.filter(record => record.id !== action.payload)
      };
      
    case 'SET_HEALTH_STATS':
      return { ...state, healthStats: action.payload };
      
    case 'SET_INSIGHTS':
      const insights = action.payload;
      return {
        ...state,
        insights,
        unreadInsights: insights.filter(i => !i.isRead).length,
        urgentAlerts: insights.filter(i => !i.isResolved && i.urgency >= 4)
      };
      
    case 'ADD_INSIGHT':
      const newInsights = [action.payload, ...state.insights];
      return {
        ...state,
        insights: newInsights,
        unreadInsights: newInsights.filter(i => !i.isRead).length,
        urgentAlerts: newInsights.filter(i => !i.isResolved && i.urgency >= 4)
      };
      
    case 'UPDATE_INSIGHT':
      const updatedInsights = state.insights.map(insight =>
        insight.id === action.payload.id 
          ? { ...insight, ...action.payload.updates }
          : insight
      );
      return {
        ...state,
        insights: updatedInsights,
        unreadInsights: updatedInsights.filter(i => !i.isRead).length,
        urgentAlerts: updatedInsights.filter(i => !i.isResolved && i.urgency >= 4)
      };
      
    case 'SET_CHAT_SESSIONS':
      return { ...state, chatSessions: action.payload };
      
    case 'SET_ACTIVE_CHAT_SESSION':
      return { ...state, activeChatSession: action.payload };
      
    case 'UPDATE_CHAT_SESSION':
      return {
        ...state,
        chatSessions: state.chatSessions.map(session =>
          session.id === action.payload.id 
            ? { ...session, ...action.payload.updates, updatedAt: new Date() }
            : session
        ),
        activeChatSession: state.activeChatSession?.id === action.payload.id
          ? { ...state.activeChatSession, ...action.payload.updates, updatedAt: new Date() }
          : state.activeChatSession
      };
      
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
      
    case 'SET_LAST_FETCH':
      return {
        ...state,
        lastFetch: { ...state.lastFetch, [action.payload.key]: action.payload.value }
      };
      
    case 'RESET_DATA':
      return initialState;
      
    default:
      return state;
  }
}

// Context
const DataContext = createContext<DataContextType | undefined>(undefined);

// Provider component
interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(dataReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // Utility to check if data is stale
  const isDataStale = useCallback((key: keyof DataState['lastFetch'], maxAgeMs = 5 * 60 * 1000): boolean => {
    const lastFetch = state.lastFetch[key];
    if (!lastFetch) return true;
    return Date.now() - lastFetch.getTime() > maxAgeMs;
  }, [state.lastFetch]);

  // Health Records operations
  const refreshHealthRecords = useCallback(async () => {
    if (!user) return;
    
    dispatch({ type: 'SET_LOADING', payload: { key: 'records', value: true } });
    dispatch({ type: 'SET_ERROR', payload: { key: 'records', value: undefined } });
    
    try {
      const records = await databaseService.getHealthRecords(user.id, { limit: 100 });
      dispatch({ type: 'SET_HEALTH_RECORDS', payload: records });
      dispatch({ type: 'SET_LAST_FETCH', payload: { key: 'records', value: new Date() } });
    } catch (error: any) {
      console.error('Error fetching health records:', error);
      dispatch({ type: 'SET_ERROR', payload: { key: 'records', value: error.message } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'records', value: false } });
    }
  }, [user]);

  const createHealthRecord = useCallback(async (record: Omit<HealthRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<HealthRecord> => {
    const newRecord = await databaseService.createHealthRecord(record);
    dispatch({ type: 'ADD_HEALTH_RECORD', payload: newRecord });
    return newRecord;
  }, []);

  const updateHealthRecord = useCallback(async (id: string, updates: Partial<HealthRecord>) => {
    await databaseService.updateHealthRecord(id, updates);
    dispatch({ type: 'UPDATE_HEALTH_RECORD', payload: { id, updates } });
  }, []);

  const deleteHealthRecord = useCallback(async (id: string) => {
    await databaseService.deleteHealthRecord(id);
    dispatch({ type: 'DELETE_HEALTH_RECORD', payload: id });
  }, []);

  const getHealthRecordsByType = useCallback((type: string): HealthRecord[] => {
    return state.healthRecords.filter(record => record.type === type);
  }, [state.healthRecords]);

  const getRecentHealthRecords = useCallback((days = 7): HealthRecord[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return state.healthRecords.filter(record => record.timestamp >= cutoffDate);
  }, [state.healthRecords]);

  // Health Stats
  const refreshHealthStats = useCallback(async () => {
    if (!user) return;
    
    dispatch({ type: 'SET_LOADING', payload: { key: 'stats', value: true } });
    
    try {
      const stats = await databaseService.getHealthStats(user.id);
      dispatch({ type: 'SET_HEALTH_STATS', payload: stats });
      dispatch({ type: 'SET_LAST_FETCH', payload: { key: 'stats', value: new Date() } });
    } catch (error: any) {
      console.error('Error fetching health stats:', error);
      dispatch({ type: 'SET_ERROR', payload: { key: 'stats', value: error.message } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'stats', value: false } });
    }
  }, [user]);

  // Insights operations
  const refreshInsights = useCallback(async () => {
    if (!user) return;
    
    dispatch({ type: 'SET_LOADING', payload: { key: 'insights', value: true } });
    
    try {
      const insights = await databaseService.getInsights(user.id, { limit: 50 });
      dispatch({ type: 'SET_INSIGHTS', payload: insights });
      dispatch({ type: 'SET_LAST_FETCH', payload: { key: 'insights', value: new Date() } });
    } catch (error: any) {
      console.error('Error fetching insights:', error);
      dispatch({ type: 'SET_ERROR', payload: { key: 'insights', value: error.message } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'insights', value: false } });
    }
  }, [user]);

  const createInsight = useCallback(async (insight: Omit<Insight, 'id' | 'createdAt'>): Promise<Insight> => {
    const newInsight = await databaseService.createInsight(insight);
    dispatch({ type: 'ADD_INSIGHT', payload: newInsight });
    return newInsight;
  }, []);

  const markInsightAsRead = useCallback(async (id: string) => {
    await databaseService.markInsightAsRead(id);
    dispatch({ type: 'UPDATE_INSIGHT', payload: { id, updates: { isRead: true } } });
  }, []);

  const resolveInsight = useCallback(async (id: string) => {
    await databaseService.resolveInsight(id);
    dispatch({ type: 'UPDATE_INSIGHT', payload: { id, updates: { isResolved: true } } });
  }, []);

  const getInsightsByUrgency = useCallback((urgency: number): Insight[] => {
    return state.insights.filter(insight => insight.urgency === urgency);
  }, [state.insights]);

  const getUnresolvedAlerts = useCallback((): Insight[] => {
    return state.insights.filter(insight => !insight.isResolved && insight.urgency >= 3);
  }, [state.insights]);

  // Chat operations
  const refreshChatSessions = useCallback(async () => {
    if (!user) return;
    
    dispatch({ type: 'SET_LOADING', payload: { key: 'chat', value: true } });
    
    try {
      const sessions = await databaseService.getChatSessions(user.id);
      dispatch({ type: 'SET_CHAT_SESSIONS', payload: sessions });
      dispatch({ type: 'SET_LAST_FETCH', payload: { key: 'chat', value: new Date() } });
    } catch (error: any) {
      console.error('Error fetching chat sessions:', error);
      dispatch({ type: 'SET_ERROR', payload: { key: 'chat', value: error.message } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'chat', value: false } });
    }
  }, [user]);

  const createChatSession = useCallback(async (title: string): Promise<ChatSession> => {
    if (!user) throw new Error('User not authenticated');
    
    const session = await databaseService.createChatSession({
      userId: user.id,
      title,
      messages: []
    });
    
    dispatch({ type: 'SET_CHAT_SESSIONS', payload: [session, ...state.chatSessions] });
    return session;
  }, [user, state.chatSessions]);

  const updateChatSession = useCallback(async (id: string, updates: Partial<ChatSession>) => {
    await databaseService.updateChatSession(id, updates);
    dispatch({ type: 'UPDATE_CHAT_SESSION', payload: { id, updates } });
  }, []);

  const setActiveChatSession = useCallback((session: ChatSession | null) => {
    dispatch({ type: 'SET_ACTIVE_CHAT_SESSION', payload: session });
  }, []);

  // Settings operations
  const refreshSettings = useCallback(async () => {
    if (!user) return;
    
    try {
      const settings = await databaseService.getSettings(user.id);
      if (settings) {
        dispatch({ type: 'SET_SETTINGS', payload: settings });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, [user]);

  const updateSettings = useCallback(async (preferences: Partial<AppSettings['preferences']>) => {
    if (!user) return;
    
    const settings = await databaseService.updateSettings(user.id, preferences);
    dispatch({ type: 'SET_SETTINGS', payload: settings });
  }, [user]);

  // Smart context for AI
  const getSmartContext = useCallback(async () => {
    if (!user) throw new Error('User not authenticated');
    
    const recentRecords = getRecentHealthRecords(30);
    // const settings = state.settings;
    const urgentAlerts = getUnresolvedAlerts();
    
    // Build intelligent context
    const childProfile = {
      age: '7 months', // TODO: Calculate from birth date
      currentWeight: recentRecords.find(r => r.type === 'weight')?.data?.weight || null,
      currentHeight: recentRecords.find(r => r.type === 'height')?.data?.height || null,
      developmentStage: 'infant_6_12_months'
    };
    
    const recentPatterns = {
      sleepPattern: 'stable', // TODO: Analyze sleep records
      appetitePattern: 'normal', // TODO: Analyze feeding records
      behaviorPattern: 'normal', // TODO: Analyze behavior records
      growthPattern: 'steady' // TODO: Analyze weight/height trends
    };
    
    const environmentalFactors = {
      seasonalChanges: false, // TODO: Check weather data
      recentTravelOrChanges: false, // TODO: Check location changes
      newFoodIntroductions: [], // TODO: Extract from recent records
      medicationEffects: recentRecords.filter(r => r.type === 'medication').map(r => r.data.medication.name),
      vaccinationEffects: false // TODO: Check recent vaccinations
    };
    
    const parentalConcerns = {
      detectedFromInput: urgentAlerts.map(a => a.title),
      frequencyMentioned: urgentAlerts.length,
      urgencyLevel: urgentAlerts.length > 0 ? Math.max(...urgentAlerts.map(a => a.urgency)) : 1,
      similarPastConcerns: [] // TODO: Analyze historical patterns
    };
    
    const medicalHistory = {
      recentSymptoms: recentRecords.filter(r => r.type === 'symptom'),
      lastVaccinations: recentRecords.filter(r => r.type === 'vaccine'),
      currentMedications: recentRecords.filter(r => r.type === 'medication'),
      chronicConditions: [] // TODO: Extract from settings or records
    };
    
    return {
      childProfile,
      recentPatterns,
      environmentalFactors,
      parentalConcerns,
      medicalHistory
    };
  }, [user, state.settings, getRecentHealthRecords, getUnresolvedAlerts]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    if (!user) return;
    
    await Promise.all([
      refreshHealthRecords(),
      refreshInsights(),
      refreshHealthStats(),
      refreshChatSessions(),
      refreshSettings()
    ]);
  }, [user, refreshHealthRecords, refreshInsights, refreshHealthStats, refreshChatSessions, refreshSettings]);

  // Exportar todos los datos
  const exportData = useCallback(async (): Promise<Blob> => {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      healthRecords: state.healthRecords,
      insights: state.insights,
      chatSessions: state.chatSessions,
      settings: state.settings,
      profile: localStorage.getItem('userProfile') ? JSON.parse(localStorage.getItem('userProfile')!) : null
    };
    
    const jsonStr = JSON.stringify(data, null, 2);
    return new Blob([jsonStr], { type: 'application/json' });
  }, [state]);

  // Limpiar todos los datos
  const clearAllData = useCallback(async () => {
    // Limpiar localStorage
    const keysToRemove = [
      'healthRecords',
      'insights',
      'chatSessions',
      'appSettings',
      'userProfile',
      'aiProcessingHistory',
      'chatHistory'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Resetear estado
    dispatch({ type: 'SET_HEALTH_RECORDS', payload: [] });
    dispatch({ type: 'SET_INSIGHTS', payload: [] });
    dispatch({ type: 'SET_CHAT_SESSIONS', payload: [] });
    dispatch({ type: 'RESET_DATA' });
  }, [dispatch]);

  // Auto-refresh data when user changes or on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshAllData();
    } else {
      dispatch({ type: 'RESET_DATA' });
    }
  }, [isAuthenticated, user, refreshAllData]);

  // Auto-refresh stale data
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      if (isDataStale('records', 10 * 60 * 1000)) { // 10 minutes
        refreshHealthRecords();
      }
      if (isDataStale('insights', 5 * 60 * 1000)) { // 5 minutes
        refreshInsights();
      }
      if (isDataStale('stats', 15 * 60 * 1000)) { // 15 minutes
        refreshHealthStats();
      }
    }, 60 * 1000); // Check every minute
    
    return () => clearInterval(interval);
  }, [user, isDataStale, refreshHealthRecords, refreshInsights, refreshHealthStats]);

  const contextValue: DataContextType = {
    state,
    refreshHealthRecords,
    createHealthRecord,
    updateHealthRecord,
    deleteHealthRecord,
    getHealthRecordsByType,
    getRecentHealthRecords,
    refreshInsights,
    createInsight,
    markInsightAsRead,
    resolveInsight,
    getInsightsByUrgency,
    getUnresolvedAlerts,
    refreshChatSessions,
    createChatSession,
    updateChatSession,
    setActiveChatSession,
    refreshSettings,
    updateSettings,
    refreshHealthStats,
    getSmartContext,
    isDataStale,
    refreshAllData,
    exportData,
    clearAllData
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

// Hook to use the data context
export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export default DataContext;