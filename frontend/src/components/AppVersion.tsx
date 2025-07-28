import React from 'react';
import packageJson from '../../package.json';

interface AppVersionProps {
  className?: string;
  showLabel?: boolean;
}

const AppVersion: React.FC<AppVersionProps> = ({ 
  className = '', 
  showLabel = false 
}) => {
  return (
    <div className={`app-version ${className}`}>
      {showLabel && <span className="version-label">v</span>}
      <span className="version-number">{packageJson.version}</span>
    </div>
  );
};

export default AppVersion;