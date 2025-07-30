import React from 'react';
import { getVersionInfo, formatVersion, VersionInfo } from '../utils/version';

interface AppVersionProps {
  className?: string;
  showLabel?: boolean;
  format?: 'short' | 'full' | 'detailed';
  showTooltip?: boolean;
}

const AppVersion: React.FC<AppVersionProps> = ({ 
  className = '', 
  showLabel = false,
  format = 'short',
  showTooltip = false
}) => {
  const versionInfo = getVersionInfo();
  const versionText = formatVersion(versionInfo, format);
  
  const tooltipContent = showTooltip ? (
    <div className="version-tooltip">
      <div><strong>Versión:</strong> {versionInfo.version}</div>
      <div><strong>Commit:</strong> {versionInfo.commitHash.substring(0, 7)}</div>
      <div><strong>Build:</strong> {new Date(versionInfo.buildDate).toLocaleDateString()}</div>
      <div><strong>Ambiente:</strong> {versionInfo.environment}</div>
    </div>
  ) : null;

  return (
    <div className={`app-version ${className}`} title={showTooltip ? undefined : versionText}>
      {showLabel && <span className="version-label">v</span>}
      <span className="version-number">{versionText}</span>
      {tooltipContent && (
        <div className="version-tooltip-container">
          {tooltipContent}
        </div>
      )}
    </div>
  );
};

export default AppVersion;