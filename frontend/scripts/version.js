#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

// Función para ejecutar comandos de git de forma segura
function getGitInfo() {
  try {
    const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const buildDate = new Date().toISOString();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    
    return {
      commitHash,
      buildDate,
      branch
    };
  } catch (error) {
    console.warn('No se pudo obtener información de git:', error.message);
    return {
      commitHash: 'unknown',
      buildDate: new Date().toISOString(),
      branch: 'unknown'
    };
  }
}

// Función para generar el archivo de variables de entorno
function generateEnvFile() {
  const gitInfo = getGitInfo();
  const envContent = `VITE_COMMIT_HASH=${gitInfo.commitHash}
VITE_BUILD_DATE=${gitInfo.buildDate}
VITE_BRANCH=${gitInfo.branch}
`;

  const envPath = join(process.cwd(), '.env.local');
  writeFileSync(envPath, envContent);
  console.log('✅ Archivo .env.local generado con información de versión');
}

// Función para actualizar el package.json con información de build
function updatePackageJson() {
  const packagePath = join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  
  const gitInfo = getGitInfo();
  
  // Agregar información de build al package.json
  packageJson.buildInfo = {
    commitHash: gitInfo.commitHash,
    buildDate: gitInfo.buildDate,
    branch: gitInfo.branch
  };
  
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  console.log('✅ package.json actualizado con información de build');
}

// Función principal
function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'env':
      generateEnvFile();
      break;
    case 'package':
      updatePackageJson();
      break;
    case 'all':
      generateEnvFile();
      updatePackageJson();
      break;
    default:
      console.log('Uso: node scripts/version.js [env|package|all]');
      console.log('  env: Genera archivo .env.local con variables de entorno');
      console.log('  package: Actualiza package.json con información de build');
      console.log('  all: Ejecuta ambos comandos');
      break;
  }
}

main();