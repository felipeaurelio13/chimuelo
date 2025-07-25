import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { type HealthRecord } from '../services/databaseService';
import '../styles/Timeline.css';

interface TimelineFilters {
  type?: string;
  dateRange: 'week' | 'month' | 'quarter' | 'year' | 'all';
  requiresAttention?: boolean;
  tags?: string[];
  searchQuery?: string;
}

interface TimelineGroup {
  date: string;
  records: HealthRecord[];
  insights?: string[];
  predictions?: {
    type: string;
    description: string;
    confidence: number;
    daysAhead: number;
  }[];
}

interface PredictiveInsight {
  type: 'growth_trend' | 'health_pattern' | 'milestone_prediction' | 'alert_forecast';
  title: string;
  description: string;
  confidence: number;
  timeframe: string;
  actionable: boolean;
  urgency: 1 | 2 | 3 | 4 | 5;
}

const Timeline: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    state: { healthRecords, healthStats, isLoading },
    refreshHealthRecords,
    // markInsightAsRead 
  } = useData();

  // Local state
  const [filters, setFilters] = useState<TimelineFilters>({
    dateRange: 'month'
  });
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'cards' | 'chart'>('timeline');
  const [showPredictions, setShowPredictions] = useState(true);

  // Auto-refresh on mount
  useEffect(() => {
    if (user && healthRecords.length === 0) {
      refreshHealthRecords();
    }
  }, [user, healthRecords.length, refreshHealthRecords]);

  // Filter and group records
  const filteredRecords = useMemo(() => {
    let filtered = [...healthRecords];

    // Type filter
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(record => record.type === filters.type);
    }

    // Date range filter
    const now = new Date();
    const startDate = new Date();
    
    switch (filters.dateRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate.setFullYear(1970);
        break;
    }
    
    filtered = filtered.filter(record => record.timestamp >= startDate);

    // Attention filter
    if (filters.requiresAttention !== undefined) {
      filtered = filtered.filter(record => record.requiresAttention === filters.requiresAttention);
    }

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(record => 
        record.type.toLowerCase().includes(query) ||
        record.notes?.toLowerCase().includes(query) ||
        record.metadata.originalInput?.toLowerCase().includes(query) ||
        JSON.stringify(record.data).toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [healthRecords, filters]);

  // Group records by date
  const timelineGroups = useMemo(() => {
    const groups: { [key: string]: TimelineGroup } = {};

    filteredRecords.forEach(record => {
      const dateKey = record.timestamp.toISOString().split('T')[0];
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          records: [],
          insights: [],
          predictions: []
        };
      }
      
      groups[dateKey].records.push(record);
    });

    // Sort by date (newest first)
    return Object.values(groups).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [filteredRecords]);

  // Generate predictive insights
  const predictiveInsights = useMemo((): PredictiveInsight[] => {
    if (!showPredictions || filteredRecords.length < 3) return [];

    const insights: PredictiveInsight[] = [];

    // Growth trend prediction
    const weightRecords = filteredRecords.filter(r => r.type === 'weight')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    if (weightRecords.length >= 3) {
      const weights = weightRecords.map(r => r.data.weight);
      const avgGrowth = (weights[weights.length - 1] - weights[0]) / (weights.length - 1);
      
      if (avgGrowth > 0) {
        insights.push({
          type: 'growth_trend',
          title: 'Tendencia de crecimiento positiva',
          description: `Maxi está ganando peso consistentemente (~${avgGrowth.toFixed(1)}kg/medición). Siguiente pesaje esperado: ${(weights[weights.length - 1] + avgGrowth).toFixed(1)}kg en 1-2 semanas.`,
          confidence: 0.85,
          timeframe: '1-2 semanas',
          actionable: false,
          urgency: 2
        });
      }
    }

    // Health pattern analysis
    const symptomRecords = filteredRecords.filter(r => r.type === 'symptom');
    const recentSymptoms = symptomRecords.filter(r => 
      r.timestamp >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    if (recentSymptoms.length > 0) {
      const symptomTypes = recentSymptoms.map(r => r.data.symptoms?.[0]?.name).filter(Boolean);
      const uniqueSymptoms = [...new Set(symptomTypes)];
      
      if (uniqueSymptoms.length > 1) {
        insights.push({
          type: 'health_pattern',
          title: 'Patrón de síntomas detectado',
          description: `Se han registrado múltiples síntomas en la última semana: ${uniqueSymptoms.join(', ')}. Considera consultar al pediatra si persisten.`,
          confidence: 0.7,
          timeframe: 'Próximos 3-5 días',
          actionable: true,
          urgency: 3
        });
      }
    }

    // Milestone prediction
    const milestoneRecords = filteredRecords.filter(r => r.type === 'milestone')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (milestoneRecords.length > 0) {
      const lastMilestone = milestoneRecords[0];
      const category = lastMilestone.data.milestone.category;
      
      // Simple milestone prediction logic
      const predictions: { [key: string]: string } = {
        'motor_gross': 'gateo independiente o primeros pasos',
        'motor_fine': 'agarre de pinza más refinado',
        'language': 'primeras palabras o más vocabulario',
        'cognitive': 'mayor comprensión de causa-efecto',
        'social': 'más interacción e imitación',
        'emotional': 'mayor expresión emocional'
      };

      if (predictions[category]) {
        insights.push({
          type: 'milestone_prediction',
          title: `Próximo hito esperado en ${category}`,
          description: `Basado en el desarrollo actual, es probable que Maxi logre: ${predictions[category]} en las próximas 2-6 semanas.`,
          confidence: 0.75,
          timeframe: '2-6 semanas',
          actionable: false,
          urgency: 1
        });
      }
    }

    // Alert forecast based on patterns
    const urgentRecords = filteredRecords.filter(r => r.requiresAttention);
    if (urgentRecords.length > 1) {
      const timeBetweenAlerts = urgentRecords.reduce((acc, record, index) => {
        if (index === 0) return acc;
        const prev = urgentRecords[index - 1];
        return acc + (record.timestamp.getTime() - prev.timestamp.getTime());
      }, 0) / (urgentRecords.length - 1);

      const daysBetween = timeBetweenAlerts / (24 * 60 * 60 * 1000);
      
      if (daysBetween < 14) {
        insights.push({
          type: 'alert_forecast',
          title: 'Patrón de alertas frecuentes',
          description: `Se han detectado alertas médicas cada ~${daysBetween.toFixed(1)} días. Considera una consulta preventiva para evaluar la situación general.`,
          confidence: 0.6,
          timeframe: `Próximos ${daysBetween.toFixed(0)} días`,
          actionable: true,
          urgency: 4
        });
      }
    }

    return insights.sort((a, b) => b.urgency - a.urgency);
  }, [filteredRecords, showPredictions]);

  // Record type icons and colors
  const getRecordIcon = (type: string): string => {
    const icons: { [key: string]: string } = {
      weight: '⚖️',
      height: '📏',
      temperature: '🌡️',
      symptom: '🤒',
      medication: '💊',
      vaccine: '💉',
      milestone: '🎯',
      note: '📝'
    };
    return icons[type] || '📋';
  };

  const getRecordColor = (record: HealthRecord): string => {
    if (record.requiresAttention) return 'urgent';
    if (record.confidence < 0.5) return 'low-confidence';
    
    const colors: { [key: string]: string } = {
      weight: 'blue',
      height: 'green',
      temperature: 'red',
      symptom: 'yellow',
      medication: 'purple',
      vaccine: 'indigo',
      milestone: 'pink',
      note: 'gray'
    };
    return colors[record.type] || 'gray';
  };

  // Format record data for display
  const formatRecordData = (record: HealthRecord): string => {
    switch (record.type) {
      case 'weight':
        return `${record.data.weight} ${record.data.unit}`;
      case 'height':
        return `${record.data.height} ${record.data.unit}`;
      case 'temperature':
        return `${record.data.temperature}°${record.data.unit === 'celsius' ? 'C' : 'F'}`;
      case 'symptom':
        return record.data.symptoms?.map((s: any) => s.name).join(', ') || 'Síntoma registrado';
      case 'medication':
        return `${record.data.medication.name} - ${record.data.medication.dose.amount}${record.data.medication.dose.unit}`;
      case 'milestone':
        return record.data.milestone.achievement;
      case 'note':
        return record.data.title || record.data.content.substring(0, 50) + '...';
      default:
        return 'Registro de salud';
    }
  };

  // Handle record selection
  const handleRecordClick = (record: HealthRecord) => {
    setSelectedRecord(selectedRecord?.id === record.id ? null : record);
  };

  // Quick filter buttons
  const quickFilters = [
    { label: 'Todo', value: 'all' },
    { label: 'Peso', value: 'weight' },
    { label: 'Altura', value: 'height' },
    { label: 'Síntomas', value: 'symptom' },
    { label: 'Medicamentos', value: 'medication' },
    { label: 'Hitos', value: 'milestone' }
  ];

  const dateRangeOptions = [
    { label: '7 días', value: 'week' },
    { label: '1 mes', value: 'month' },
    { label: '3 meses', value: 'quarter' },
    { label: '1 año', value: 'year' },
    { label: 'Todo', value: 'all' }
  ];

  if (isLoading.records) {
    return (
      <div className="timeline-loading">
        <div className="loading-spinner"></div>
        <p>Cargando timeline...</p>
      </div>
    );
  }

  return (
    <div className="timeline-page">
      <header className="timeline-header">
        <div className="header-top">
          <button className="back-button" onClick={() => navigate(-1)}>
            ←
          </button>
          <h1>Timeline de Salud</h1>
          <div className="header-actions">
            <button 
              className="capture-button"
              onClick={() => navigate('/capture')}
            >
              + Capturar
            </button>
          </div>
        </div>
        
        {/* Stats Summary */}
        {healthStats && (
          <div className="stats-summary">
            <div className="stat-item">
              <span className="stat-number">{healthStats.totalRecords}</span>
              <span className="stat-label">Registros</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{healthStats.alertsCount}</span>
              <span className="stat-label">Alertas</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{predictiveInsights.length}</span>
              <span className="stat-label">Insights</span>
            </div>
          </div>
        )}
      </header>

      {/* Filters */}
      <section className="timeline-filters">
        <div className="filter-group">
          <label>Tipo:</label>
          <div className="filter-buttons">
            {quickFilters.map(filter => (
              <button
                key={filter.value}
                className={`filter-button ${filters.type === filter.value ? 'active' : ''}`}
                onClick={() => setFilters(prev => ({ ...prev, type: filter.value === 'all' ? undefined : filter.value }))}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Período:</label>
          <div className="filter-buttons">
            {dateRangeOptions.map(option => (
              <button
                key={option.value}
                className={`filter-button ${filters.dateRange === option.value ? 'active' : ''}`}
                onClick={() => setFilters(prev => ({ ...prev, dateRange: option.value as any }))}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Vista:</label>
          <div className="view-buttons">
            <button
              className={`view-button ${viewMode === 'timeline' ? 'active' : ''}`}
              onClick={() => setViewMode('timeline')}
            >
              📅 Timeline
            </button>
            <button
              className={`view-button ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              🗃️ Tarjetas
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showPredictions}
              onChange={(e) => setShowPredictions(e.target.checked)}
            />
            Mostrar predicciones
          </label>
        </div>
      </section>

      {/* Predictive Insights */}
      {showPredictions && predictiveInsights.length > 0 && (
        <section className="predictive-insights">
          <h3>💡 Insights Predictivos</h3>
          <div className="insights-grid">
            {predictiveInsights.map((insight, index) => (
              <div 
                key={index} 
                className={`insight-card ${insight.type} urgency-${insight.urgency}`}
              >
                <div className="insight-header">
                  <h4>{insight.title}</h4>
                  <div className="insight-metadata">
                    <span className="confidence">{Math.round(insight.confidence * 100)}% confianza</span>
                    <span className="timeframe">{insight.timeframe}</span>
                  </div>
                </div>
                <p>{insight.description}</p>
                {insight.actionable && (
                  <button className="insight-action">
                    Más información
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timeline Content */}
      <main className="timeline-content">
        {timelineGroups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No hay registros</h3>
            <p>Comienza capturando datos de salud para ver tu timeline.</p>
            <button 
              className="empty-action"
              onClick={() => navigate('/capture')}
            >
              Crear primer registro
            </button>
          </div>
        ) : (
          <div className={`timeline-view ${viewMode}`}>
            {timelineGroups.map((group) => (
              <div key={group.date} className="timeline-group">
                <div className="timeline-date">
                  <h3>{new Date(group.date).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</h3>
                  <span className="record-count">{group.records.length} registro{group.records.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="timeline-records">
                  {group.records.map((record) => (
                    <div 
                      key={record.id}
                      className={`timeline-record ${getRecordColor(record)} ${selectedRecord?.id === record.id ? 'selected' : ''}`}
                      onClick={() => handleRecordClick(record)}
                    >
                      <div className="record-icon">
                        {getRecordIcon(record.type)}
                      </div>
                      
                      <div className="record-content">
                        <div className="record-header">
                          <h4>{formatRecordData(record)}</h4>
                          <div className="record-metadata">
                            <span className="record-time">
                              {record.timestamp.toLocaleTimeString('es-ES', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            {record.requiresAttention && (
                              <span className="attention-badge">⚠️ Atención</span>
                            )}
                            <span className={`confidence-badge ${record.confidence > 0.7 ? 'high' : record.confidence > 0.4 ? 'medium' : 'low'}`}>
                              {Math.round(record.confidence * 100)}%
                            </span>
                          </div>
                        </div>

                        {record.notes && (
                          <p className="record-notes">{record.notes}</p>
                        )}

                        {selectedRecord?.id === record.id && (
                          <div className="record-details">
                            <div className="detail-section">
                              <h5>Datos extraídos:</h5>
                              <pre className="data-preview">
                                {JSON.stringify(record.data, null, 2)}
                              </pre>
                            </div>
                            
                            {record.metadata.originalInput && (
                              <div className="detail-section">
                                <h5>Input original:</h5>
                                <p className="original-input">"{record.metadata.originalInput}"</p>
                              </div>
                            )}

                            <div className="detail-section">
                              <h5>Metadata:</h5>
                              <div className="metadata-grid">
                                <span><strong>Fuente:</strong> {record.metadata.source}</span>
                                <span><strong>Tipo de input:</strong> {record.metadata.inputType}</span>
                                <span><strong>Creado:</strong> {record.createdAt.toLocaleString()}</span>
                                {record.updatedAt !== record.createdAt && (
                                  <span><strong>Actualizado:</strong> {record.updatedAt.toLocaleString()}</span>
                                )}
                              </div>
                            </div>

                            <div className="record-actions">
                              <button className="edit-button">✏️ Editar</button>
                              <button className="share-button">📤 Compartir</button>
                              <button className="delete-button">🗑️ Eliminar</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Timeline;
