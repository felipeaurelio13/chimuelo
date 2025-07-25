import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/Settings.css';

interface UserProfile {
  babyName: string;
  birthDate: string;
  birthWeight?: number;
  birthHeight?: number;
  photo?: string;
}

interface AppSettings {
  weightUnit: 'kg' | 'lb';
  heightUnit: 'cm' | 'in';
  temperatureUnit: 'celsius' | 'fahrenheit';
  language: 'es' | 'en';
  notifications: boolean;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { exportData, clearAllData } = useData();
  const { theme, setTheme } = useTheme();
  
  const [activeSection, setActiveSection] = useState<'profile' | 'appearance' | 'data' | 'about'>('profile');
  const [profile, setProfile] = useState<UserProfile>({
    babyName: '',
    birthDate: '',
    birthWeight: undefined,
    birthHeight: undefined,
  });
  const [settings, setSettings] = useState<AppSettings>({
    weightUnit: 'kg',
    heightUnit: 'cm',
    temperatureUnit: 'celsius',
    language: 'es',
    notifications: true,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Cargar datos del perfil y configuración
  useEffect(() => {
    const savedProfile = localStorage.getItem('userProfile');
    const savedSettings = localStorage.getItem('appSettings');
    
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
    
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Guardar perfil
  const saveProfile = () => {
    setSaveStatus('saving');
    localStorage.setItem('userProfile', JSON.stringify(profile));
    
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  // Guardar configuración
  const saveSettings = () => {
    setSaveStatus('saving');
    localStorage.setItem('appSettings', JSON.stringify(settings));
    
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  // Exportar datos
  const handleExportData = async () => {
    try {
      const dataBlob = await exportData();
      const url = URL.createObjectURL(dataBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chimuelo-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar datos:', error);
      alert('Error al exportar los datos');
    }
  };

  // Importar datos
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        // TODO: Validar e importar datos
        localStorage.setItem('healthRecords', JSON.stringify(data.healthRecords || []));
        localStorage.setItem('userProfile', JSON.stringify(data.profile || {}));
        alert('Datos importados exitosamente');
        window.location.reload();
      } catch (error) {
        console.error('Error al importar datos:', error);
        alert('Error al importar los datos. Verifica que el archivo sea válido.');
      }
    };
    reader.readAsText(file);
  };

  // Limpiar todos los datos
  const handleClearData = async () => {
    if (window.confirm('¿Estás seguro? Esta acción no se puede deshacer.')) {
      await clearAllData();
      await logout();
      navigate('/login');
    }
    setShowDeleteConfirm(false);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return '☀️';
      case 'dark': return '🌙';
      case 'system': return '🖥️';
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Claro';
      case 'dark': return 'Oscuro';
      case 'system': return 'Sistema';
    }
  };

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Volver
        </button>
        <h1>Configuración</h1>
        {saveStatus === 'saving' && <span className="save-status">Guardando...</span>}
        {saveStatus === 'saved' && <span className="save-status saved">✓ Guardado</span>}
      </header>

      <div className="settings-container">
        {/* Navegación lateral */}
        <nav className="settings-nav">
          <button
            className={`nav-item ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveSection('profile')}
          >
            <span className="nav-icon">👶</span>
            <span className="nav-label">Perfil del bebé</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveSection('appearance')}
          >
            <span className="nav-icon">🎨</span>
            <span className="nav-label">Apariencia</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'data' ? 'active' : ''}`}
            onClick={() => setActiveSection('data')}
          >
            <span className="nav-icon">💾</span>
            <span className="nav-label">Datos y privacidad</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'about' ? 'active' : ''}`}
            onClick={() => setActiveSection('about')}
          >
            <span className="nav-icon">ℹ️</span>
            <span className="nav-label">Acerca de</span>
          </button>
        </nav>

        {/* Contenido de configuración */}
        <main className="settings-content">
          {/* Sección Perfil */}
          {activeSection === 'profile' && (
            <section className="settings-section">
              <h2>Perfil del bebé</h2>
              <p className="section-description">
                Información básica sobre tu bebé para personalizar la experiencia
              </p>

              <div className="form-group">
                <label htmlFor="babyName">Nombre del bebé</label>
                <input
                  id="babyName"
                  type="text"
                  value={profile.babyName}
                  onChange={(e) => setProfile({ ...profile, babyName: e.target.value })}
                  placeholder="Ej: Maxi"
                />
              </div>

              <div className="form-group">
                <label htmlFor="birthDate">Fecha de nacimiento</label>
                <input
                  id="birthDate"
                  type="date"
                  value={profile.birthDate}
                  onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="birthWeight">Peso al nacer ({settings.weightUnit})</label>
                  <input
                    id="birthWeight"
                    type="number"
                    step="0.01"
                    value={profile.birthWeight || ''}
                    onChange={(e) => setProfile({ ...profile, birthWeight: parseFloat(e.target.value) || undefined })}
                    placeholder={`Ej: ${settings.weightUnit === 'kg' ? '3.5' : '7.7'}`}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="birthHeight">Altura al nacer ({settings.heightUnit})</label>
                  <input
                    id="birthHeight"
                    type="number"
                    step="0.1"
                    value={profile.birthHeight || ''}
                    onChange={(e) => setProfile({ ...profile, birthHeight: parseFloat(e.target.value) || undefined })}
                    placeholder={`Ej: ${settings.heightUnit === 'cm' ? '51' : '20'}`}
                  />
                </div>
              </div>

              <button className="btn-primary" onClick={saveProfile}>
                Guardar perfil
              </button>
            </section>
          )}

          {/* Sección Apariencia */}
          {activeSection === 'appearance' && (
            <section className="settings-section">
              <h2>Apariencia</h2>
              <p className="section-description">
                Personaliza cómo se ve la aplicación
              </p>

              <div className="setting-item">
                <div className="setting-info">
                  <h3>Tema de la aplicación</h3>
                  <p>Elige entre modo claro, oscuro o automático</p>
                </div>
                <button className="theme-toggle" onClick={cycleTheme}>
                  <span className="theme-icon">{getThemeIcon()}</span>
                  <span className="theme-label">{getThemeLabel()}</span>
                </button>
              </div>

              <div className="theme-preview">
                <div className="preview-card">
                  <div className="preview-header">Vista previa</div>
                  <div className="preview-content">
                    <div className="preview-text">Este es un texto de ejemplo</div>
                    <button className="preview-button">Botón de muestra</button>
                  </div>
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h3>Unidades de medida</h3>
                  <p>Configura las unidades preferidas</p>
                </div>
              </div>

              <div className="units-grid">
                <div className="form-group">
                  <label htmlFor="weightUnit">Peso</label>
                  <select
                    id="weightUnit"
                    value={settings.weightUnit}
                    onChange={(e) => setSettings({ ...settings, weightUnit: e.target.value as 'kg' | 'lb' })}
                  >
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="lb">Libras (lb)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="heightUnit">Altura</label>
                  <select
                    id="heightUnit"
                    value={settings.heightUnit}
                    onChange={(e) => setSettings({ ...settings, heightUnit: e.target.value as 'cm' | 'in' })}
                  >
                    <option value="cm">Centímetros (cm)</option>
                    <option value="in">Pulgadas (in)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="temperatureUnit">Temperatura</label>
                  <select
                    id="temperatureUnit"
                    value={settings.temperatureUnit}
                    onChange={(e) => setSettings({ ...settings, temperatureUnit: e.target.value as 'celsius' | 'fahrenheit' })}
                  >
                    <option value="celsius">Celsius (°C)</option>
                    <option value="fahrenheit">Fahrenheit (°F)</option>
                  </select>
                </div>
              </div>

              <button className="btn-primary" onClick={saveSettings}>
                Guardar configuración
              </button>
            </section>
          )}

          {/* Sección Datos y Privacidad */}
          {activeSection === 'data' && (
            <section className="settings-section">
              <h2>Datos y privacidad</h2>
              <p className="section-description">
                Gestiona tus datos y configuración de privacidad
              </p>

              <div className="data-actions">
                <div className="action-card">
                  <div className="action-icon">📤</div>
                  <h3>Exportar datos</h3>
                  <p>Descarga todos tus datos en formato JSON</p>
                  <button className="btn-secondary" onClick={handleExportData}>
                    Exportar
                  </button>
                </div>

                <div className="action-card">
                  <div className="action-icon">📥</div>
                  <h3>Importar datos</h3>
                  <p>Restaura datos desde un archivo de respaldo</p>
                  <label className="btn-secondary">
                    Importar
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                <div className="action-card danger">
                  <div className="action-icon">🗑️</div>
                  <h3>Borrar todos los datos</h3>
                  <p>Elimina permanentemente todos los datos</p>
                  <button 
                    className="btn-danger" 
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Borrar datos
                  </button>
                </div>
              </div>

              <div className="privacy-info">
                <h3>🔒 Tu privacidad importa</h3>
                <ul>
                  <li>Todos los datos se almacenan localmente en tu dispositivo</li>
                  <li>No compartimos información con terceros</li>
                  <li>No se requiere conexión a internet</li>
                  <li>Tú tienes el control total de tus datos</li>
                </ul>
              </div>
            </section>
          )}

          {/* Sección Acerca de */}
          {activeSection === 'about' && (
            <section className="settings-section">
              <h2>Acerca de Chimuelo</h2>
              
              <div className="about-content">
                <div className="app-info">
                  <div className="app-icon">🍼</div>
                  <h3>Chimuelo Health Tracker</h3>
                  <p className="version">Versión 1.0.0</p>
                </div>

                <div className="about-description">
                  <p>
                    Chimuelo es una aplicación diseñada con amor para ayudarte a hacer seguimiento 
                    de la salud y desarrollo de tu bebé de manera simple e inteligente.
                  </p>
                  
                  <h4>Características principales:</h4>
                  <ul>
                    <li>✨ Procesamiento inteligente con IA</li>
                    <li>📊 Visualización clara de datos</li>
                    <li>🔒 Privacidad total - datos locales</li>
                    <li>📱 Funciona sin conexión (PWA)</li>
                    <li>🌙 Modo claro y oscuro</li>
                  </ul>
                </div>

                <div className="credits">
                  <p>Hecho con ❤️ para padres modernos</p>
                  <p className="copyright">© 2024 Chimuelo. Todos los derechos reservados.</p>
                </div>
              </div>

              <div className="logout-section">
                <button className="btn-logout" onClick={logout}>
                  Cerrar sesión
                </button>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Modal de confirmación para borrar datos */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ ¿Estás seguro?</h3>
            <p>
              Esta acción eliminará permanentemente todos los datos de salud, 
              configuraciones y tu cuenta. No se puede deshacer.
            </p>
            <div className="dialog-actions">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </button>
              <button className="btn-danger" onClick={handleClearData}>
                Sí, borrar todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { Settings };