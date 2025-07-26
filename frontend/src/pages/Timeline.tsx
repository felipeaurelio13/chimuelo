import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { TimelineErrorBoundary } from '../components/TimelineErrorBoundary';
import { TimelineSkeleton } from '../components/TimelineSkeleton';
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

// Timeline component wrapped with Error Boundary
const TimelineContent: React.FC = () => {
  if (import.meta.env.VITE_DEV === 'TRUE') {
    console.log('Timeline component rendered.');
  }
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    state: { healthRecords = [], healthStats, isLoading, errors },
    refreshHealthRecords,
  } = useData();

  // Local state
  const [filters, setFilters] = useState<TimelineFilters>({
    dateRange: 'month'
  });
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showInsights, setShowInsights] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Load data on mount with improved error handling
  useEffect(() => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Timeline component mounted.');
    }

    const loadData = async () => {
      if (!user?.id) {
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('Timeline: No user ID available, cannot load data.');
        }
        setLocalError('Usuario no autenticado. Por favor, inicia sesión nuevamente.');
        return;
      }

      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Timeline: Loading data for user:', user.id);
      }

      try {
        setLocalError(null);
        await refreshHealthRecords();
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('Timeline: Data refreshed from DataContext.');
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar datos';
        
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.error('Timeline: Error loading timeline data:', err);
        }

        // Set local error with retry option
        if (retryCount < 3) {
          setLocalError(`${errorMessage} (Intento ${retryCount + 1}/3)`);
        } else {
          setLocalError('Error persistente al cargar los datos. Por favor, recarga la página.');
        }
      }
    };

    loadData();

    return () => {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Timeline component unmounted.');
      }
    };
  }, [refreshHealthRecords, user?.id, retryCount]);

  // Retry function
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setLocalError(null);
  }, []);

  // Filter records based on date range and type with error handling
  const filteredRecords = useMemo(() => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Timeline: Filtering records by type:', selectedType, 'Total records:', healthRecords.length, 'Filters:', filters);
    }
    
    if (!Array.isArray(healthRecords)) {
      console.warn('Timeline: healthRecords is not an array:', healthRecords);
      return [];
    }
    
    try {
      const now = new Date();
      let startDate = new Date();
      
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
          startDate = new Date(0); // Epoch
          break;
      }

      const result = healthRecords.filter(record => {
        if (!record || !record.timestamp) return false;
        
        const recordDate = new Date(record.timestamp);
        if (isNaN(recordDate.getTime())) {
          console.warn('Timeline: Invalid date in record:', record);
          return false;
        }
        
        if (recordDate < startDate) return false;
        
        if (selectedType !== 'all' && record.type !== selectedType) return false;
        
        if (filters.requiresAttention && !record.requiresAttention) return false;
        
        if (filters.searchQuery) {
          const searchLower = filters.searchQuery.toLowerCase();
          const hasMatch = JSON.stringify(record.data).toLowerCase().includes(searchLower) ||
                          record.notes?.toLowerCase().includes(searchLower);
          if (!hasMatch) return false;
        }
        
        return true;
      });

      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Timeline: Filtered records count:', result.length);
      }
      return result;
    } catch (err: unknown) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.error('Timeline: Error filtering records:', err);
      }
      return [];
    }
  }, [healthRecords, filters, selectedType]);

  // Group records by date with error handling
  const groupedRecords = useMemo(() => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Timeline: Grouping filtered records.');
    }
    if (!Array.isArray(filteredRecords)) return [];
    
    try {
      const groups: { [key: string]: HealthRecord[] } = {};
      
      filteredRecords.forEach(record => {
        if (!record || !record.timestamp) return;
        
        const date = new Date(record.timestamp);
        if (isNaN(date.getTime())) return;
        
        const dateKey = date.toISOString().split('T')[0];
        
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(record);
      });

      // Convert to array and sort by date
      const sortedGroups = Object.entries(groups)
        .map(([date, records]) => ({
          date,
          records: records.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Timeline: Grouped records count:', sortedGroups.length);
      }
      return sortedGroups;
    } catch (err: unknown) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.error('Timeline: Error grouping records:', err);
      }
      return [];
    }
  }, [filteredRecords]);

  // Generate predictive insights with error handling
  const predictiveInsights = useMemo(() => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Timeline: Generating predictive insights.');
    }
    const insights: PredictiveInsight[] = [];
    
    try {
      // Growth trend analysis
      const weightRecords = filteredRecords
        .filter(r => r.type === 'weight' && r.data?.weight)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      if (weightRecords.length >= 3) {
        const weights = weightRecords.map(r => r.data.weight).filter(w => typeof w === 'number' && !isNaN(w));
        if (weights.length >= 2) {
          const avgGrowth = (weights[weights.length - 1] - weights[0]) / (weights.length - 1);
          
          if (avgGrowth > 0) {
            insights.push({
              type: 'growth_trend',
              title: 'Tendencia de crecimiento positiva',
              description: `Ganancia de peso consistente (~${avgGrowth.toFixed(1)}kg/medición).`,
              confidence: 0.85,
              timeframe: '1-2 semanas',
              actionable: false,
              urgency: 2
            });
          }
        }
      }

      // Health pattern analysis
      const symptomRecords = filteredRecords.filter(r => r.type === 'symptom' && r.data?.symptoms);
      const recentSymptoms = symptomRecords.filter(r => 
        new Date(r.timestamp) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

      if (recentSymptoms.length > 0) {
        const symptomTypes = recentSymptoms
          .flatMap(r => r.data.symptoms || [])
          .map(s => s?.name)
          .filter(Boolean);
        const uniqueSymptoms = [...new Set(symptomTypes)];
        
        if (uniqueSymptoms.length > 1) {
          insights.push({
            type: 'health_pattern',
            title: 'Patrón de síntomas detectado',
            description: `Múltiples síntomas en la última semana: ${uniqueSymptoms.join(', ')}.`,
            confidence: 0.7,
            timeframe: 'Próximos 3-5 días',
            actionable: true,
            urgency: 3
          });
        }
      }
    } catch (err: unknown) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.error('Timeline: Error generating insights:', err);
      }
    }

    return insights;
  }, [filteredRecords]);

  // Toggle group expansion
  const toggleGroupExpansion = useCallback((date: string) => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Timeline: Toggling group expansion for date:', date);
    }
    setExpandedGroups(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(date)) {
        newExpanded.delete(date);
      } else {
        newExpanded.add(date);
      }
      return newExpanded;
    });
  }, []);

  // Handle filter changes
  const handleDateRangeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Timeline: Date range filter changed to:', e.target.value);
    }
    setFilters(prev => ({ ...prev, dateRange: e.target.value as TimelineFilters['dateRange'] }));
  }, []);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Timeline: Type filter changed to:', e.target.value);
    }
    setSelectedType(e.target.value);
  }, []);

  const handleShowInsightsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Timeline: Show insights toggled to:', e.target.checked);
    }
    setShowInsights(e.target.checked);
  }, []);

  // Format date for display
  const formatDateGroup = useCallback((date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return d.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      });
    }
  }, []);

  // Get icon for record type
  const getTypeIcon = useCallback((type: string) => {
    const icons: { [key: string]: string } = {
      weight: '⚖️',
      height: '📏',
      temperature: '🌡️',
      symptom: '🤒',
      medication: '💊',
      feeding: '🍼',
      milestone: '🎯',
      vaccine: '💉',
      note: '📝'
    };
    return icons[type] || '📋';
  }, []);

  // Handle error states (both DataContext errors and local errors)
  const error = localError || errors.records;
  
  if (error) {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Timeline: Rendering error state.', error);
    }
    return (
      <div className="timeline-page">
        <div className="error-container">
          <h2>Error al cargar Timeline</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={handleRetry}>
              Intentar de nuevo
            </button>
            <button className="btn btn-secondary" onClick={() => {
              if (import.meta.env.VITE_DEV === 'TRUE') {
                console.log('Timeline: Reload page button clicked.');
              }
              window.location.reload();
            }}>
              Recargar página
            </button>
            <button className="btn btn-secondary" onClick={() => {
              if (import.meta.env.VITE_DEV === 'TRUE') {
                console.log('Timeline: Back to home button clicked from error state.');
              }
              navigate('/');
            }}>
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle loading state with skeleton
  if (isLoading) {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Timeline: Rendering loading state.');
    }
    return <TimelineSkeleton count={5} />;
  }

  // Handle empty state
  if (!healthRecords || healthRecords.length === 0) {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Timeline: Rendering empty state (no records).');
    }
    return (
      <div className="timeline-page">
        <header className="timeline-header">
          <button className="back-button" onClick={() => {
            if (import.meta.env.VITE_DEV === 'TRUE') {
              console.log('Timeline: Back button clicked from empty state.');
            }
            navigate('/');
          }}>
            ← Volver
          </button>
          <h1>Línea de Tiempo</h1>
        </header>
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h2>No hay registros aún</h2>
          <p>Comienza agregando datos de salud de tu bebé</p>
          <button className="btn btn-primary" onClick={() => {
            if (import.meta.env.VITE_DEV === 'TRUE') {
              console.log('Timeline: Add first record button clicked from empty state.');
            }
            navigate('/capture');
          }}>
            Agregar primer registro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-page">
      <header className="timeline-header">
        <button className="back-button" onClick={() => {
          if (import.meta.env.VITE_DEV === 'TRUE') {
            console.log('Timeline: Back button clicked.');
          }
          navigate('/');
        }}>
          ← Volver
        </button>
        <h1>Línea de Tiempo</h1>
        <button className="add-button btn btn-primary" onClick={() => {
          if (import.meta.env.VITE_DEV === 'TRUE') {
            console.log('Timeline: Add new record button clicked.');
          }
          navigate('/capture');
        }}>
          + Agregar
        </button>
      </header>

      {/* Filters */}
      <div className="timeline-filters">
        <div className="filter-group">
          <label>Período:</label>
          <select 
            className="input"
            value={filters.dateRange} 
            onChange={handleDateRangeChange}
          >
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
            <option value="quarter">Últimos 3 meses</option>
            <option value="year">Último año</option>
            <option value="all">Todo</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Tipo:</label>
          <select 
            className="input"
            value={selectedType} 
            onChange={handleTypeChange}
          >
            <option value="all">Todos</option>
            <option value="weight">Peso</option>
            <option value="height">Altura</option>
            <option value="temperature">Temperatura</option>
            <option value="symptom">Síntomas</option>
            <option value="medication">Medicación</option>
            <option value="feeding">Alimentación</option>
            <option value="milestone">Hitos</option>
            <option value="vaccine">Vacunas</option>
            <option value="note">Notas</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={showInsights}
              onChange={handleShowInsightsChange}
            />
            Mostrar predicciones
          </label>
        </div>
      </div>

      {/* Predictive Insights */}
      {showInsights && predictiveInsights.length > 0 && (
        <div className="insights-section">
          <h2>🔮 Predicciones e Insights</h2>
          <div className="insights-grid">
            {predictiveInsights.map((insight, index) => (
              <div 
                key={index} 
                className={`insight-card card urgency-${insight.urgency}`}
              >
                <h3>{insight.title}</h3>
                <p>{insight.description}</p>
                <div className="insight-meta">
                  <span className="confidence">
                    Confianza: {Math.round(insight.confidence * 100)}%
                  </span>
                  <span className="timeframe">{insight.timeframe}</span>
                </div>
                {insight.actionable && (
                  <button className="action-button btn btn-secondary" onClick={() => {
                    if (import.meta.env.VITE_DEV === 'TRUE') {
                      console.log('Timeline: Action button clicked for insight:', insight.title);
                    }
                    alert(`Tomar acción para: ${insight.title}`);
                  }}>
                    Tomar acción
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Content */}
      <main className="timeline-content">
        {groupedRecords.length === 0 ? (
          <div className="no-results">
            <p>No se encontraron registros con los filtros seleccionados</p>
            <button className="btn btn-secondary" onClick={() => {
              setFilters({ dateRange: 'all' });
              setSelectedType('all');
            }}>
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="timeline-groups">
            {groupedRecords.map((group) => (
              <div key={group.date} className="timeline-group card">
                <div 
                  className="group-header"
                  onClick={() => toggleGroupExpansion(group.date)}
                >
                  <h3>{formatDateGroup(group.date)}</h3>
                  <span className="record-count">{group.records.length} registro{group.records.length !== 1 ? 's' : ''}</span>
                  <span className={`expand-icon ${expandedGroups.has(group.date) ? 'expanded' : ''}`}>
                    ▼
                  </span>
                </div>
                
                {expandedGroups.has(group.date) && (
                  <div className="group-records">
                    {group.records.map((record) => (
                      <div 
                        key={record.id} 
                        className={`timeline-record ${record.requiresAttention ? 'attention' : ''}`}
                        onClick={() => {
                          if (import.meta.env.VITE_DEV === 'TRUE') {
                            console.log('Timeline: Record clicked:', record.id, record.type);
                          }
                        }}
                      >
                        <div className="record-icon">{getTypeIcon(record.type)}</div>
                        <div className="record-content">
                          <div className="record-header">
                            <span className="record-type">{record.type}</span>
                            <span className="record-time">
                              {new Date(record.timestamp).toLocaleTimeString('es-ES', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          <div className="record-data">
                            {record.type === 'weight' && record.data?.weight && (
                              <p>Peso: {record.data.weight} kg</p>
                            )}
                            {record.type === 'height' && record.data?.height && (
                              <p>Altura: {record.data.height} cm</p>
                            )}
                            {record.type === 'temperature' && record.data?.temperature && (
                              <p>Temperatura: {record.data.temperature}°C</p>
                            )}
                            {record.type === 'symptom' && record.data?.symptoms && (
                              <p>Síntomas: {record.data.symptoms.map((s: any) => s.name).join(', ')}</p>
                            )}
                            {record.notes && (
                              <p className="record-notes">{record.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

// Main Timeline component with Error Boundary
const Timeline: React.FC = () => {
  return (
    <TimelineErrorBoundary>
      <TimelineContent />
    </TimelineErrorBoundary>
  );
};

export default Timeline;
