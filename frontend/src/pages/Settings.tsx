import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import '../styles/Settings.css';

interface UserProfile {
  babyName?: string;
  birthDate?: string;
  birthWeight?: number;
  birthHeight?: number;
  photo?: string;
}

interface AppSettingsConfig {
  weightUnit: 'kg' | 'lb';
  heightUnit: 'cm' | 'in';
  temperatureUnit: 'celsius' | 'fahrenheit';
  language: 'es' | 'en';
  notifications: boolean;
  theme: 'light' | 'dark' | 'system';
}

const Settings: React.FC = () => {
  if (import.meta.env.VITE_DEV === 'TRUE') {
    console.log('Settings component rendered.');
  }

  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { exportData, clearAllData } = useData();

  const [activeSection, setActiveSection] = useState<'profile' | 'appearance' | 'data' | 'about'>('profile');
  const [profile, setProfile] = useState<UserProfile>({
    babyName: '',
    birthDate: '',
    birthWeight: undefined,
    birthHeight: undefined,
  });
  const [settings, setSettings] = useState<AppSettingsConfig>({
    weightUnit: 'kg',
    heightUnit: 'cm',
    temperatureUnit: 'celsius',
    language: 'es',
    notifications: true,
    theme: 'system',
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Load profile and settings data
  useEffect(() => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Settings component mounted. Current user:', user?.email);
    }

    const savedProfile = localStorage.getItem('userProfile');
    const savedSettings = localStorage.getItem('appSettings');

    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile);
        setProfile(parsedProfile);
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('Settings: Loaded profile from localStorage.', parsedProfile);
        }
      } catch (e) {
        console.error('Settings: Error parsing saved profile:', e);
      }
    }
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('Settings: Loaded settings from localStorage.', parsedSettings);
        }
      } catch (e) {
        console.error('Settings: Error parsing saved settings:', e);
      }
    }

    return () => {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Settings component unmounted.');
      }
    };
  }, [user]);

  // Save profile
  const saveProfile = useCallback(() => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Settings: Save profile initiated.', profile);
    }
    setSaveStatus('saving');
    localStorage.setItem('userProfile', JSON.stringify(profile));
    setTimeout(() => {
      setSaveStatus('saved');
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Settings: Profile saved.');
      }
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  }, [profile]);

  // Save settings
  const saveSettings = useCallback(() => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Settings: Save settings initiated.', settings);
    }
    setSaveStatus('saving');
    localStorage.setItem('appSettings', JSON.stringify(settings));
    setTimeout(() => {
      setSaveStatus('saved');
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Settings: Settings saved.');
      }
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  }, [settings]);

  // Export data
  const handleExportData = async () => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Settings: Export data initiated.');
    }
    try {
      const dataBlob = await exportData();
      const url = URL.createObjectURL(dataBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maxi_data_export_${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Settings: Data exported successfully.');
      }
      alert('Datos exportados exitosamente.');
    } catch (error: unknown) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        if (error instanceof Error) {
          console.error('Settings: Error exporting data:', error.message);
        } else {
          console.error('Settings: Error exporting data:', error);
        }
      }
      alert('Error al exportar los datos.');
    }
  };

  // Import data
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Settings: Import data initiated.');
    }
    const file = event.target.files?.[0];
    if (!file) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Settings: No file selected for import.');
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        await clearAllData();
        // TODO: Implement actual data import logic into databaseService
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('Settings: Data imported successfully (mock).', importedData);
        }
        alert('Datos importados exitosamente. (Funcionalidad de importación completa requiere implementación adicional)');
        // Refresh data context or navigate to dashboard to show new data
        navigate('/', { replace: true });
      } catch (error: unknown) {
        if (import.meta.env.VITE_DEV === 'TRUE') {
          if (error instanceof Error) {
            console.error('Settings: Error importing data:', error.message);
          } else {
            console.error('Settings: Error importing data:', error);
          }
        }
        alert('Error al importar los datos. Verifica que el archivo sea válido.');
      }
    };
    reader.readAsText(file);
  };

  // Clear all data
  const handleClearData = async () => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Settings: Clear all data initiated.');
    }
    if (window.confirm('¿Estás seguro? Esta acción no se puede deshacer y borrará todos los registros de salud de Maxi.')) {
      try {
        await clearAllData();
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('Settings: All data cleared.');
        }
        alert('Todos los datos han sido eliminados.');
        // Optionally, refresh data context or navigate
        navigate('/login', { replace: true }); // Redirect to login after clearing all data
      } catch (error: unknown) {
        if (import.meta.env.VITE_DEV === 'TRUE') {
          if (error instanceof Error) {
            console.error('Settings: Error clearing data:', error.message);
          } else {
            console.error('Settings: Error clearing data:', error);
          }
        }
        alert('Error al eliminar los datos.');
      }
    }
  };

  const handleLogout = async () => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Settings: Logout initiated.');
    }
    await logout();
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Settings: Logout completed, navigating to login.');
    }
    navigate('/login');
  };

  const handleChangePassword = () => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Settings: Change password clicked.');
    }
    // Implement password change logic
    alert('Funcionalidad de cambio de contraseña no implementada en esta demo.');
  };

  // Helper for theme icon
  const getThemeIcon = useCallback(() => {
    switch (settings.theme) {
      case 'light': return '☀️';
      case 'dark': return '🌙';
      case 'system': return '🖥️';
      default: return '🎨';
    }
  }, [settings.theme]);

  // Helper for theme label
  const getThemeLabel = useCallback(() => {
    switch (settings.theme) {
      case 'light': return 'Claro';
      case 'dark': return 'Oscuro';
      case 'system': return 'Sistema';
      default: return 'Tema';
    }
  }, [settings.theme]);

  const cycleTheme = useCallback(() => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Settings: Cycling theme.');
    }
    const themes: AppSettingsConfig['theme'][] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(settings.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setSettings(prev => ({ ...prev, theme: themes[nextIndex] }));
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Settings: Theme cycled to:', themes[nextIndex]);
    }
  }, [settings.theme]);

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button className="back-button" onClick={() => {
          if (import.meta.env.VITE_DEV === 'TRUE') {
            console.log('Settings: Back button clicked.');
          }
          navigate('/');
        }}>
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
            onClick={() => {
              if (import.meta.env.VITE_DEV === 'TRUE') {
                console.log('Settings: Navigating to profile section.');
              }
              setActiveSection('profile');
            }}
          >
            <span className="nav-icon">👶</span>
            <span className="nav-label">Perfil del bebé</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'appearance' ? 'active' : ''}`}
            onClick={() => {
              if (import.meta.env.VITE_DEV === 'TRUE') {
                console.log('Settings: Navigating to appearance section.');
              }
              setActiveSection('appearance');
            }}
          >
            <span className="nav-icon">🎨</span>
            <span className="nav-label">Apariencia</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'data' ? 'active' : ''}`}
            onClick={() => {
              if (import.meta.env.VITE_DEV === 'TRUE') {
                console.log('Settings: Navigating to data section.');
              }
              setActiveSection('data');
            }}
          >
            <span className="nav-icon">💾</span>
            <span className="nav-label">Datos y privacidad</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'about' ? 'active' : ''}`}
            onClick={() => {
              if (import.meta.env.VITE_DEV === 'TRUE') {
                console.log('Settings: Navigating to about section.');
              }
              setActiveSection('about');
            }}
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
                  value={profile.babyName || ''}
                  onChange={(e) => {
                    setProfile({ ...profile, babyName: e.target.value });
                    if (import.meta.env.VITE_DEV === 'TRUE') {
                      console.log('Settings: Baby name changed:', e.target.value);
                    }
                  }}
                  placeholder="Ej: Maxi"
                />
              </div>

              <div className="form-group">
                <label htmlFor="birthDate">Fecha de nacimiento</label>
                <input
                  id="birthDate"
                  type="date"
                  value={profile.birthDate || ''}
                  onChange={(e) => {
                    setProfile({ ...profile, birthDate: e.target.value });
                    if (import.meta.env.VITE_DEV === 'TRUE') {
                      console.log('Settings: Birth date changed:', e.target.value);
                    }
                  }}
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
                    onChange={(e) => {
                      setProfile({ ...profile, birthWeight: parseFloat(e.target.value) || undefined });
                      if (import.meta.env.VITE_DEV === 'TRUE') {
                        console.log('Settings: Birth weight changed:', e.target.value);
                      }
                    }}
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
                    onChange={(e) => {
                      setProfile({ ...profile, birthHeight: parseFloat(e.target.value) || undefined });
                      if (import.meta.env.VITE_DEV === 'TRUE') {
                        console.log('Settings: Birth height changed:', e.target.value);
                      }
                    }}
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
                    onChange={(e) => {
                      setSettings({ ...settings, weightUnit: e.target.value as 'kg' | 'lb' });
                      if (import.meta.env.VITE_DEV === 'TRUE') {
                        console.log('Settings: Weight unit changed:', e.target.value);
                      }
                    }}
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
                    onChange={(e) => {
                      setSettings({ ...settings, heightUnit: e.target.value as 'cm' | 'in' });
                      if (import.meta.env.VITE_DEV === 'TRUE') {
                        console.log('Settings: Height unit changed:', e.target.value);
                      }
                    }}
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
                    onChange={(e) => {
                      setSettings({ ...settings, temperatureUnit: e.target.value as 'celsius' | 'fahrenheit' });
                      if (import.meta.env.VITE_DEV === 'TRUE') {
                        console.log('Settings: Temperature unit changed:', e.target.value);
                      }
                    }}
                  >
                    <option value="celsius">Celsius (°C)</option>
                    <option value="fahrenheit">Fahrenheit (°F)</option>
                  </select>
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h3>Notificaciones</h3>
                  <p>Activa o desactiva las notificaciones de la aplicación.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, notifications: e.target.checked }));
                    if (import.meta.env.VITE_DEV === 'TRUE') {
                      console.log('Settings: Notifications toggled to:', e.target.checked);
                    }
                    saveSettings(); // Assuming saveSettings should be called
                  }}
                />
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
                      id="import-file"
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
                    onClick={handleClearData}
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
              <h2>Acerca de Maxi</h2>
              
              <div className="about-content">
                <div className="app-info">
                  <div className="app-icon">👶</div>
                  <h3>Maxi Health Tracker</h3>
                  <p className="version">Versión 1.0.0</p>
                </div>

                <div className="about-description">
                  <p>
                    Maxi es una aplicación diseñada con amor para ayudarte a hacer seguimiento 
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
                  <p className="copyright">© 2024 Maxi. Todos los derechos reservados.</p>
                </div>
              </div>
            </section>
          )}

          {/* Danger Zone: Logout and Delete Account are here for consistency with original. */}
          {/* The screenshot suggests these are top-level buttons, but the CSS has 'logout-section' and 'btn-logout' */}
          {/* Given the section names in CSS, I'll place these within a dedicated section or keep them in 'about' if that's the current structure. */}
          {/* For now, integrating them into the 'about' section as shown in the original CSS structure for logout. */}
          {/* The screenshot shows them outside sections. I'll follow the CSS structure to fix styling. */}
          {activeSection === 'about' && (
            <section className="settings-section">
              <div className="logout-section">
                <button className="btn-logout" onClick={handleLogout}>
                  Cerrar sesión
                </button>
              </div>
              <div className="danger-zone">
                <h3>Zona de Peligro</h3>
                <button className="settings-option-button delete-account-button" onClick={() => {
                  if (import.meta.env.VITE_DEV === 'TRUE') {
                    console.log('Settings: Delete account button clicked.');
                  }
                  alert('Funcionalidad de eliminar cuenta no implementada en esta demo.');
                }}>
                  <span className="icon">🗑️</span>
                  Eliminar Cuenta (Demo)
                </button>
              </div>
            </section>
          )}

        </main>
      </div>
    </div>
  );
};

export default Settings;