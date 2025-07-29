import React, { useState, useEffect } from 'react';
import './DataStorageInfo.css';

interface StorageInfo {
  storageType: string;
  totalRecords: number;
  lastSync: Date | null;
  browserSpecific: boolean;
}

const DataStorageInfo: React.FC = () => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkStorageInfo();
  }, []);

  const checkStorageInfo = async () => {
    try {
      // Check IndexedDB
      const indexedDBSupported = 'indexedDB' in window;
      
      // Get records count from localStorage estimation
      const localStorageKeys = Object.keys(localStorage);
      const healthKeys = localStorageKeys.filter(key => 
        key.includes('health') || key.includes('user') || key.includes('medical')
      );

      setStorageInfo({
        storageType: indexedDBSupported ? 'IndexedDB + localStorage' : 'localStorage',
        totalRecords: healthKeys.length,
        lastSync: null, // No cloud sync yet
        browserSpecific: true
      });
    } catch (error) {
      console.error('Error checking storage info:', error);
    }
  };

  if (!storageInfo) return null;

  return (
    <div className="storage-info-card">
      <div className="storage-header" onClick={() => setShowDetails(!showDetails)}>
        <div className="storage-icon">
          💾
        </div>
        <div className="storage-content">
          <h3>Información de Datos</h3>
          <p>{storageInfo.totalRecords} registros almacenados</p>
        </div>
        <button className="toggle-details">
          {showDetails ? '▼' : '▶'}
        </button>
      </div>

      {showDetails && (
        <div className="storage-details">
          <div className="detail-item">
            <span className="detail-label">Almacenamiento:</span>
            <span className="detail-value">{storageInfo.storageType}</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">Específico del navegador:</span>
            <span className="detail-value">
              {storageInfo.browserSpecific ? '✅ Sí' : '❌ No'}
            </span>
          </div>

          <div className="storage-explanation">
            <h4>¿Por qué veo datos diferentes en otros navegadores?</h4>
            <p>
              Los datos de Maxi se almacenan localmente en tu dispositivo usando IndexedDB y localStorage. 
              Esto significa que:
            </p>
            <ul>
              <li>📱 Los datos están seguros en tu dispositivo</li>
              <li>🔒 No se sincronizan automáticamente entre navegadores</li>
              <li>💻 Chrome, Safari, Firefox tienen datos separados</li>
              <li>🏠 Recomendamos usar siempre el mismo navegador</li>
            </ul>
            
            <div className="future-feature">
              <p><strong>🚀 Próximamente:</strong> Sincronización en la nube para acceder desde cualquier dispositivo</p>
            </div>
          </div>

          <div className="storage-actions">
            <button 
              className="btn secondary small"
              onClick={() => {
                if (confirm('¿Estás seguro? Esto borrará todos los datos de este navegador.')) {
                  localStorage.clear();
                  location.reload();
                }
              }}
            >
              🗑️ Limpiar datos del navegador
            </button>
          </div>
        </div>
      )}


    </div>
  );
};

export default DataStorageInfo;