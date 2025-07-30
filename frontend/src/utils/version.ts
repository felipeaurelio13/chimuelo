import packageJson from '../../package.json';

export interface VersionInfo {
  version: string;
  buildDate: string;
  commitHash: string;
  environment: string;
  fullVersion: string;
}

// Obtener información del commit desde las variables de entorno de Vite
const getCommitHash = (): string => {
  return import.meta.env.VITE_COMMIT_HASH || 'dev';
};

const getBuildDate = (): string => {
  return import.meta.env.VITE_BUILD_DATE || new Date().toISOString();
};

const getEnvironment = (): string => {
  return import.meta.env.MODE || 'development';
};

export const getVersionInfo = (): VersionInfo => {
  const version = packageJson.version;
  const buildDate = getBuildDate();
  const commitHash = getCommitHash();
  const environment = getEnvironment();
  
  const fullVersion = `${version}-${commitHash.substring(0, 7)}`;
  
  return {
    version,
    buildDate,
    commitHash,
    environment,
    fullVersion
  };
};

export const formatVersion = (info: VersionInfo, format: 'short' | 'full' | 'detailed' = 'short'): string => {
  switch (format) {
    case 'short':
      return `v${info.version}`;
    case 'full':
      return `v${info.fullVersion}`;
    case 'detailed':
      return `v${info.version} (${info.commitHash.substring(0, 7)}) - ${info.environment}`;
    default:
      return `v${info.version}`;
  }
};

export const isDevelopment = (): boolean => {
  return getEnvironment() === 'development';
};

export const isProduction = (): boolean => {
  return getEnvironment() === 'production';
};