#!/bin/bash

# Script para iniciar toda la plataforma Chimuelo
# Versión 1.0.0

set -e

echo "🚀 Iniciando Chimuelo Health Tracker Platform..."
echo "=================================================="

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Función para verificar node y npm
check_dependencies() {
    echo "🔍 Verificando dependencias..."
    
    if ! command_exists node; then
        echo "❌ Node.js no está instalado. Por favor, instala Node.js 18+ desde https://nodejs.org/"
        exit 1
    fi
    
    if ! command_exists npm; then
        echo "❌ npm no está instalado. Por favor, instala npm."
        exit 1
    fi
    
    # Verificar versión de Node
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo "❌ Node.js versión 18+ requerida. Versión actual: $(node -v)"
        exit 1
    fi
    
    echo "✅ Node.js $(node -v) y npm $(npm -v) están disponibles"
}

# Función para instalar dependencias del frontend
setup_frontend() {
    echo ""
    echo "📦 Configurando Frontend..."
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        echo "📥 Instalando dependencias del frontend..."
        npm install
    else
        echo "✅ Dependencias del frontend ya instaladas"
    fi
    
    cd ..
}

# Función para instalar dependencias del worker
setup_worker() {
    echo ""
    echo "⚡ Configurando Cloudflare Worker..."
    cd worker
    
    if [ ! -d "node_modules" ]; then
        echo "📥 Instalando dependencias del worker..."
        npm install
    else
        echo "✅ Dependencias del worker ya instaladas"
    fi
    
    cd ..
}

# Función para verificar configuración
check_config() {
    echo ""
    echo "🔧 Verificando configuración..."
    
    # Verificar archivos importantes
    if [ ! -f "frontend/src/contexts/ThemeContext.tsx" ]; then
        echo "⚠️  ThemeContext no encontrado, pero continuaremos..."
    fi
    
    if [ ! -f "frontend/public/manifest.json" ]; then
        echo "⚠️  PWA manifest no encontrado, pero continuaremos..."
    fi
    
    echo "✅ Configuración verificada"
}

# Función para iniciar el desarrollo
start_development() {
    echo ""
    echo "🌟 Iniciando modo desarrollo..."
    echo ""
    echo "Frontend estará disponible en: http://localhost:5173"
    echo "Worker de desarrollo en: http://localhost:8787 (si se configura)"
    echo ""
    echo "Para detener el servidor, presiona Ctrl+C"
    echo ""
    
    # Cambiar al directorio frontend e iniciar
    cd frontend
    
    # Verificar si el puerto 5173 está libre
    if command_exists lsof && lsof -i :5173 >/dev/null 2>&1; then
        echo "⚠️  El puerto 5173 ya está en uso. Vite elegirá el siguiente puerto disponible."
    fi
    
    # Iniciar Vite en modo desarrollo
    npm run dev -- --host
}

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [OPCIÓN]"
    echo ""
    echo "Opciones:"
    echo "  start, dev     Iniciar en modo desarrollo (por defecto)"
    echo "  build          Construir para producción"
    echo "  preview        Vista previa de la build de producción"
    echo "  worker         Configurar y desplegar worker"
    echo "  setup          Solo instalar dependencias"
    echo "  clean          Limpiar node_modules y reinstalar"
    echo "  help           Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0              # Iniciar en modo desarrollo"
    echo "  $0 dev          # Iniciar en modo desarrollo"
    echo "  $0 build        # Construir para producción"
    echo "  $0 worker       # Configurar worker de Cloudflare"
}

# Función para build de producción
build_production() {
    echo ""
    echo "🏗️  Construyendo para producción..."
    
    cd frontend
    npm run build
    
    echo "✅ Build completado en frontend/dist/"
    echo ""
    echo "Para servir localmente la build:"
    echo "  npm run preview"
    echo ""
    echo "Para desplegar:"
    echo "  - Sube el contenido de frontend/dist/ a tu servidor web"
    echo "  - Configura el worker en Cloudflare"
    
    cd ..
}

# Función para preview de producción
preview_production() {
    echo ""
    echo "👀 Vista previa de la build de producción..."
    
    cd frontend
    
    if [ ! -d "dist" ]; then
        echo "📦 Build no encontrado, construyendo primero..."
        npm run build
    fi
    
    npm run preview -- --host
    cd ..
}

# Función para configurar worker
setup_worker_cloudflare() {
    echo ""
    echo "⚡ Configuración del Worker de Cloudflare"
    echo "========================================"
    echo ""
    echo "Para configurar el worker completamente:"
    echo ""
    echo "1. Instala Wrangler CLI globalmente:"
    echo "   npm install -g wrangler"
    echo ""
    echo "2. Autentícate con Cloudflare:"
    echo "   wrangler auth"
    echo ""
    echo "3. Configura las variables de entorno:"
    echo "   cd worker"
    echo "   wrangler secret put OPENAI_API_KEY"
    echo "   wrangler secret put JWT_SECRET"
    echo ""
    echo "4. Despliega el worker:"
    echo "   wrangler deploy"
    echo ""
    echo "5. Actualiza frontend/src/services/apiService.ts con la URL del worker"
    echo ""
    echo "Para más detalles, consulta CONFIGURACION_EXTERNA.md"
}

# Función para limpiar e instalar
clean_install() {
    echo ""
    echo "🧹 Limpiando e instalando dependencias..."
    
    echo "Limpiando frontend..."
    rm -rf frontend/node_modules frontend/package-lock.json
    
    echo "Limpiando worker..."
    rm -rf worker/node_modules worker/package-lock.json
    
    echo "Reinstalando..."
    setup_frontend
    setup_worker
    
    echo "✅ Limpieza y reinstalación completada"
}

# Función principal
main() {
    # Banner
    echo ""
    echo "   _____ _     _                      _       "
    echo "  / ____| |   (_)                    | |      "
    echo " | |    | |__  _ _ __ ___  _   _  ___| | ___  "
    echo " | |    | '_ \| | '_ \` _ \| | | |/ _ \ |/ _ \ "
    echo " | |____| | | | | | | | | | |_| |  __/ | (_) |"
    echo "  \_____|_| |_|_|_| |_| |_|\__,_|\___|_|\___/ "
    echo ""
    echo "        Health Tracker Platform v1.0.0"
    echo ""
    
    # Verificar dependencias
    check_dependencies
    
    # Procesar argumentos
    case "${1:-start}" in
        "start"|"dev"|"")
            setup_frontend
            setup_worker
            check_config
            start_development
            ;;
        "build")
            setup_frontend
            build_production
            ;;
        "preview")
            setup_frontend
            preview_production
            ;;
        "worker")
            setup_worker_cloudflare
            ;;
        "setup")
            setup_frontend
            setup_worker
            echo "✅ Setup completado"
            ;;
        "clean")
            clean_install
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            echo "❌ Opción desconocida: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Manejo de señales para limpieza
cleanup() {
    echo ""
    echo "🛑 Deteniendo plataforma..."
    exit 0
}

trap cleanup INT TERM

# Ejecutar función principal
main "$@"