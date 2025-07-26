import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { type HealthRecord } from '../services/databaseService';

interface TimelineFilters {
  dateRange: 'week' | 'month' | 'quarter' | 'year' | 'all';
  type?: string;
  searchQuery?: string;
}

interface TimelineGroup {
  date: string;
  records: HealthRecord[];
  count: number;
}

const ModernTimeline: React.FC = () => {
  const { user } = useAuth();
  const { 
    state: { healthRecords = [], isLoading, errors },
    refreshHealthRecords
  } = useData();

  const [filters, setFilters] = useState<TimelineFilters>({
    dateRange: 'month'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      refreshHealthRecords();
    }
  }, [user?.id, refreshHealthRecords]);

  // Filter and group records
  const { filteredRecords, groupedRecords } = useMemo(() => {
    if (!Array.isArray(healthRecords)) return { filteredRecords: [], groupedRecords: [] };

    // Filter by date range
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
        startDate = new Date(0);
        break;
    }

    const filtered = healthRecords.filter(record => {
      const recordDate = new Date(record.timestamp);
      const matchesDate = recordDate >= startDate;
      const matchesType = !filters.type || filters.type === 'all' || record.type === filters.type;
      const matchesSearch = !searchQuery || 
        record.data?.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.type.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesDate && matchesType && matchesSearch;
    });

    // Group by date
    const grouped = filtered.reduce((groups: { [key: string]: HealthRecord[] }, record) => {
      const date = new Date(record.timestamp).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(record);
      return groups;
    }, {});

    // Convert to array and sort by date (newest first)
    const groupedArray: TimelineGroup[] = Object.entries(grouped)
      .map(([date, records]) => ({
        date,
        records: records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        count: records.length
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { filteredRecords: filtered, groupedRecords: groupedArray };
  }, [healthRecords, filters, searchQuery]);

  const getTypeIcon = (type: string): string => {
    const iconMap: { [key: string]: string } = {
      'weight': '⚖️',
      'height': '📏',
      'temperature': '🌡️',
      'medication': '💊',
      'symptom': '🤒',
      'feeding': '🍼',
      'note': '📝',
      'medical_order': '📊',
      'prescription': '💊',
      'lab_results': '📄',
      'consultation': '🩺',
      'vaccine': '💉'
    };
    return iconMap[type] || '📋';
  };

  const getTypeColor = (type: string): string => {
    const colorMap: { [key: string]: string } = {
      'weight': 'var(--color-success)',
      'height': 'var(--color-primary)',
      'temperature': 'var(--color-warning)',
      'medication': 'var(--color-secondary)',
      'symptom': 'var(--color-danger)',
      'feeding': 'var(--color-health)',
      'note': 'var(--color-text-tertiary)',
      'medical_order': 'var(--color-primary)',
      'prescription': 'var(--color-secondary)',
      'lab_results': 'var(--color-warning)',
      'consultation': 'var(--color-health)',
      'vaccine': 'var(--color-success)'
    };
    return colorMap[type] || 'var(--color-text-secondary)';
  };

  const getRecordValue = (record: HealthRecord): string => {
    if (record.data?.value && record.data?.unit) {
      return `${record.data.value}${record.data.unit}`;
    }
    if (record.data?.medication) {
      return record.data.medication;
    }
    if (record.data?.description) {
      return record.data.description.substring(0, 50) + '...';
    }
    if (record.data?.notes) {
      return record.data.notes.substring(0, 50) + '...';
    }
    return 'Sin detalles';
  };

  if (isLoading) {
    return (
      <div className="ds-page">
        <div className="ds-container">
          <div className="ds-section">
            <div className="ds-flex ds-flex-col ds-items-center ds-justify-center" style={{ minHeight: '60vh' }}>
              <div className="ds-spinner" style={{ width: '2rem', height: '2rem', marginBottom: '1rem' }}></div>
              <div className="ds-text-secondary">Cargando historial...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

     if (errors && errors.records) {
    return (
      <div className="ds-page">
        <div className="ds-container">
          <div className="ds-section">
            <div className="ds-alert ds-alert-danger">
              <span>⚠️</span>
              <div>
                <div className="ds-font-medium">Error al cargar el historial</div>
                                 <div className="ds-text-sm">{errors.records}</div>
                <button 
                  onClick={() => refreshHealthRecords()}
                  className="ds-button ds-button-sm ds-button-secondary ds-mt-2"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ds-page">
      <div className="ds-container">
        {/* Header */}
        <div className="ds-header">
          <h1 className="ds-header-title">Timeline Médico</h1>
          <p className="ds-header-subtitle">
                         Historial completo de Maxi • {filteredRecords.length} registros
          </p>
        </div>

        {/* Filters */}
        <div className="ds-card ds-mb-6">
          <div className="ds-flex ds-flex-col ds-gap-4">
            {/* Search */}
            <div>
              <label className="ds-label">Buscar en registros</label>
              <input
                type="text"
                className="ds-input"
                placeholder="Buscar por tipo, notas, medicamentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Date Range Filter */}
            <div className="ds-flex ds-gap-4 ds-flex-col" style={{ flexDirection: 'row' }}>
              <div style={{ flex: 1 }}>
                <label className="ds-label">Período</label>
                <select
                  className="ds-input"
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    dateRange: e.target.value as TimelineFilters['dateRange']
                  }))}
                >
                  <option value="week">Última semana</option>
                  <option value="month">Último mes</option>
                  <option value="quarter">Últimos 3 meses</option>
                  <option value="year">Último año</option>
                  <option value="all">Todo el historial</option>
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label className="ds-label">Tipo de registro</label>
                <select
                  className="ds-input"
                  value={filters.type || 'all'}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    type: e.target.value === 'all' ? undefined : e.target.value
                  }))}
                >
                  <option value="all">Todos los tipos</option>
                  <option value="weight">Peso</option>
                  <option value="height">Altura</option>
                  <option value="temperature">Temperatura</option>
                  <option value="medication">Medicamentos</option>
                  <option value="feeding">Alimentación</option>
                  <option value="symptom">Síntomas</option>
                  <option value="note">Notas</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="timeline-container">
          {groupedRecords.length === 0 ? (
            <div className="ds-card ds-text-center ds-p-8">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
              <h3 className="ds-text-xl ds-font-semibold ds-mb-2">No hay registros</h3>
              <p className="ds-text-secondary ds-mb-4">
                No se encontraron registros para el período seleccionado.
              </p>
              <button 
                onClick={() => setFilters({ dateRange: 'all' })}
                className="ds-button ds-button-primary"
              >
                Ver todo el historial
              </button>
            </div>
          ) : (
            <div className="ds-flex ds-flex-col ds-gap-6">
              {groupedRecords.map((group) => (
                <div key={group.date} className="timeline-group">
                  {/* Date Header */}
                  <div 
                    className="ds-flex ds-items-center ds-gap-3 ds-mb-4 ds-p-4 ds-rounded-lg"
                    style={{ 
                      backgroundColor: 'var(--color-surface-hover)',
                      cursor: 'pointer',
                      border: '1px solid var(--color-border)'
                    }}
                    onClick={() => setSelectedGroup(selectedGroup === group.date ? null : group.date)}
                  >
                    <div 
                      className="ds-rounded-full ds-flex ds-items-center ds-justify-center"
                      style={{ 
                        width: '2.5rem', 
                        height: '2.5rem',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: 'var(--font-bold)'
                      }}
                    >
                      {group.count}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="ds-font-semibold ds-text-primary">{group.date}</div>
                      <div className="ds-text-sm ds-text-secondary">
                        {group.count} registro{group.count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="ds-text-secondary">
                      {selectedGroup === group.date ? '▼' : '▶'}
                    </div>
                  </div>

                  {/* Records */}
                  {selectedGroup === group.date && (
                    <div className="ds-flex ds-flex-col ds-gap-3 ds-ml-8">
                      {group.records.map((record) => (
                        <div 
                          key={record.id} 
                          className="ds-card"
                          style={{ 
                            borderLeft: `4px solid ${getTypeColor(record.type)}`,
                            marginLeft: '1rem'
                          }}
                        >
                          <div className="ds-flex ds-items-start ds-gap-3">
                            <div 
                              style={{ 
                                fontSize: '1.5rem',
                                color: getTypeColor(record.type)
                              }}
                            >
                              {getTypeIcon(record.type)}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div className="ds-flex ds-items-center ds-gap-2 ds-mb-2">
                                <span className="ds-font-semibold ds-text-primary">
                                  {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                                </span>
                                <span className="ds-text-xs ds-text-secondary">
                                  {new Date(record.timestamp).toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <div className="ds-text-sm ds-text-secondary ds-mb-2">
                                {getRecordValue(record)}
                              </div>
                              {record.data?.notes && (
                                <div className="ds-text-sm ds-text-tertiary">
                                  {record.data.notes}
                                </div>
                              )}
                            </div>
                                                         {(record as any).aiExtracted && (
                              <div 
                                className="ds-text-xs ds-rounded-full ds-p-1"
                                style={{ 
                                  backgroundColor: 'var(--color-secondary-light)',
                                  color: 'var(--color-secondary)'
                                }}
                                title="Procesado con IA"
                              >
                                🧠
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernTimeline;