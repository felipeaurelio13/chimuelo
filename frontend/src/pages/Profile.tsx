import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import databaseService from '../services/databaseService';
import '../styles/Profile.css';

interface UserSettings {
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
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { 
    state: { settings, healthStats },
    updateSettings,
    refreshHealthStats 
  } = useData();

  const [localSettings, setLocalSettings] = useState<UserSettings>({
    units: { weight: 'kg', height: 'cm', temperature: 'celsius' },
    notifications: { enabled: true, predictiveAlerts: true, reminderFrequency: 24 },
    ui: { theme: 'auto', babyMode: false, autoNightMode: true },
    privacy: { encryptionEnabled: true, autoBackup: true, shareWithPediatrician: false }
  });

  const [dbInfo, setDbInfo] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showDataConfirm, setShowDataConfirm] = useState(false);

  // Load settings on mount
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings.preferences);
    }
    loadDatabaseInfo();
    if (healthStats === null) {
      refreshHealthStats();
    }
  }, [settings, healthStats, refreshHealthStats]);

  const loadDatabaseInfo = async () => {
    try {
      const info = await databaseService.getDatabaseInfo();
      setDbInfo(info);
    } catch (error) {
      console.error('Error loading database info:', error);
    }
  };

  const handleSettingChange = async (section: keyof UserSettings, key: string, value: any) => {
    const newSettings = {
      ...localSettings,
      [section]: {
        ...localSettings[section],
        [key]: value
      }
    };
    
    setLocalSettings(newSettings);
    
    try {
      await updateSettings(newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    
    setIsExporting(true);
    try {
      const records = await databaseService.getHealthRecords(user.id);
      const insights = await databaseService.getInsights(user.id);
      const chatSessions = await databaseService.getChatSessions(user.id);
      
      const exportData = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        records,
        insights,
        chatSessions,
        settings: localSettings,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maxi-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error al exportar datos');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearData = async () => {
    if (!user || !showDataConfirm) {
      setShowDataConfirm(true);
      return;
    }
    
    try {
      // Clear all user data
      const records = await databaseService.getHealthRecords(user.id);
      for (const record of records) {
        await databaseService.deleteHealthRecord(record.id);
      }
      
      alert('Todos los datos han sido eliminados');
      setShowDataConfirm(false);
      navigate('/');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Error al eliminar datos');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // const formatFileSize = (bytes: number): string => {
  //   if (bytes === 0) return '0 Bytes';
  //   const k = 1024;
  //   const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  //   const i = Math.floor(Math.log(bytes) / Math.log(k));
  //   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  // };

  return (
    <div className="profile-page">
      <header className="profile-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ←
        </button>
        <h1>Perfil y Configuración</h1>
        <div className="header-actions">
          <button className="logout-button" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </header>

      <main className="profile-content">
        {/* User Info */}
        <section className="user-info-section">
          <div className="user-avatar">
            <div className="avatar-placeholder">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="user-details">
              <h2>{user?.name || 'Usuario'}</h2>
              <p>{user?.email || 'No email'}</p>
              <span className="user-since">
                Miembro desde {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Health Stats Summary */}
          {healthStats && (
            <div className="stats-summary">
              <div className="stat-card">
                <span className="stat-number">{healthStats.totalRecords}</span>
                <span className="stat-label">Registros de salud</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{healthStats.alertsCount}</span>
                <span className="stat-label">Alertas activas</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">
                  {Math.max(...(healthStats.trendData?.map(d => d.count) || [0]))}
                </span>
                <span className="stat-label">Máx. registros/día</span>
              </div>
            </div>
          )}
        </section>

        {/* Settings Sections */}
        <section className="settings-section">
          <h3>⚙️ Configuración</h3>

          {/* Units */}
          <div className="setting-group">
            <h4>📏 Unidades de medida</h4>
            <div className="setting-row">
              <label>Peso:</label>
              <select
                value={localSettings.units.weight}
                onChange={(e) => handleSettingChange('units', 'weight', e.target.value)}
              >
                <option value="kg">Kilogramos (kg)</option>
                <option value="lb">Libras (lb)</option>
              </select>
            </div>
            <div className="setting-row">
              <label>Altura:</label>
              <select
                value={localSettings.units.height}
                onChange={(e) => handleSettingChange('units', 'height', e.target.value)}
              >
                <option value="cm">Centímetros (cm)</option>
                <option value="in">Pulgadas (in)</option>
              </select>
            </div>
            <div className="setting-row">
              <label>Temperatura:</label>
              <select
                value={localSettings.units.temperature}
                onChange={(e) => handleSettingChange('units', 'temperature', e.target.value)}
              >
                <option value="celsius">Celsius (°C)</option>
                <option value="fahrenheit">Fahrenheit (°F)</option>
              </select>
            </div>
          </div>

          {/* Notifications */}
          <div className="setting-group">
            <h4>🔔 Notificaciones</h4>
            <div className="setting-row">
              <label>Activar notificaciones:</label>
              <input
                type="checkbox"
                checked={localSettings.notifications.enabled}
                onChange={(e) => handleSettingChange('notifications', 'enabled', e.target.checked)}
              />
            </div>
            <div className="setting-row">
              <label>Alertas predictivas:</label>
              <input
                type="checkbox"
                checked={localSettings.notifications.predictiveAlerts}
                onChange={(e) => handleSettingChange('notifications', 'predictiveAlerts', e.target.checked)}
              />
            </div>
            <div className="setting-row">
              <label>Frecuencia de recordatorios (horas):</label>
              <input
                type="number"
                min="1"
                max="168"
                value={localSettings.notifications.reminderFrequency}
                onChange={(e) => handleSettingChange('notifications', 'reminderFrequency', parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* UI */}
          <div className="setting-group">
            <h4>🎨 Interfaz</h4>
            <div className="setting-row">
              <label>Tema:</label>
              <select
                value={localSettings.ui.theme}
                onChange={(e) => handleSettingChange('ui', 'theme', e.target.value)}
              >
                <option value="auto">Automático</option>
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
              </select>
            </div>
            <div className="setting-row">
              <label>Modo bebé dormido:</label>
              <input
                type="checkbox"
                checked={localSettings.ui.babyMode}
                onChange={(e) => handleSettingChange('ui', 'babyMode', e.target.checked)}
              />
              <small>Reduce brillo y sonidos durante la noche</small>
            </div>
            <div className="setting-row">
              <label>Modo nocturno automático:</label>
              <input
                type="checkbox"
                checked={localSettings.ui.autoNightMode}
                onChange={(e) => handleSettingChange('ui', 'autoNightMode', e.target.checked)}
              />
            </div>
          </div>

          {/* Privacy */}
          <div className="setting-group">
            <h4>🔒 Privacidad y seguridad</h4>
            <div className="setting-row">
              <label>Cifrado activado:</label>
              <input
                type="checkbox"
                checked={localSettings.privacy.encryptionEnabled}
                onChange={(e) => handleSettingChange('privacy', 'encryptionEnabled', e.target.checked)}
              />
              <small>Cifra datos sensibles localmente</small>
            </div>
            <div className="setting-row">
              <label>Backup automático:</label>
              <input
                type="checkbox"
                checked={localSettings.privacy.autoBackup}
                onChange={(e) => handleSettingChange('privacy', 'autoBackup', e.target.checked)}
              />
              <small>Próximamente: backup cifrado a la nube</small>
            </div>
            <div className="setting-row">
              <label>Compartir con pediatra:</label>
              <input
                type="checkbox"
                checked={localSettings.privacy.shareWithPediatrician}
                onChange={(e) => handleSettingChange('privacy', 'shareWithPediatrician', e.target.checked)}
              />
              <small>Permite generar reportes para consultas</small>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className="data-section">
          <h3>💾 Gestión de datos</h3>

          {dbInfo && (
            <div className="database-info">
              <h4>Información de la base de datos</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Versión:</span>
                  <span className="info-value">{dbInfo.version}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Almacenes:</span>
                  <span className="info-value">{dbInfo.stores.length}</span>
                </div>
                {Object.entries(dbInfo.recordCounts).map(([store, count]) => (
                  <div key={store} className="info-item">
                    <span className="info-label">{store}:</span>
                    <span className="info-value">{String(count)} registros</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="data-actions">
            <button 
              className="export-button"
              onClick={handleExportData}
              disabled={isExporting}
            >
              {isExporting ? '📤 Exportando...' : '📤 Exportar todos los datos'}
            </button>

            <button 
              className="clear-button"
              onClick={handleClearData}
            >
              🗑️ Eliminar todos los datos
            </button>

            {showDataConfirm && (
              <div className="confirm-dialog">
                <p>⚠️ <strong>¿Estás seguro?</strong></p>
                <p>Esta acción eliminará TODOS los datos de salud de Maxi y no se puede deshacer.</p>
                <div className="confirm-actions">
                  <button 
                    className="confirm-yes"
                    onClick={handleClearData}
                  >
                    Sí, eliminar todo
                  </button>
                  <button 
                    className="confirm-no"
                    onClick={() => setShowDataConfirm(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* About */}
        <section className="about-section">
          <h3>ℹ️ Acerca de Maxi</h3>
          <div className="about-content">
            <p>
              <strong>Maxi</strong> es tu asistente personal de salud infantil impulsado por IA.
            </p>
            <div className="version-info">
              <span>Versión: 1.0.0 MVP</span>
              <span>Desarrollado con ❤️ para el cuidado de tu bebé</span>
            </div>
            
            <div className="features-list">
              <h4>Características principales:</h4>
              <ul>
                <li>✅ Captura inteligente de datos de salud</li>
                <li>✅ Timeline predictivo con IA</li>
                <li>✅ Chat contextual con asistente médico</li>
                <li>✅ Análisis de patrones automático</li>
                <li>✅ Almacenamiento local seguro</li>
                <li>✅ Interfaz móvil optimizada</li>
                <li>🔄 Próximamente: Backup en la nube</li>
                <li>🔄 Próximamente: Reportes médicos</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Profile;