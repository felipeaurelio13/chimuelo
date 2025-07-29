# 🍼 Chimuelo Health Tracker

> **Plataforma inteligente de seguimiento de salud infantil con IA avanzada y funcionalidad offline completa**

![Version](https://img.shields.io/badge/version-2.5.2-blue.svg)
![React](https://img.shields.io/badge/React-19.1.0-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6.svg)
![PWA](https://img.shields.io/badge/PWA-Ready-orange.svg)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-green.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

Chimuelo es una aplicación web progresiva (PWA) diseñada específicamente para padres modernos que desean un seguimiento inteligente y completo de la salud de sus bebés. Combina la potencia de la inteligencia artificial con la privacidad de los datos locales.

## ✨ Características Principales

### 🤖 **IA Avanzada Context-Aware**
- **Procesamiento inteligente** con OpenAI GPT-4 y agentes locales
- **Contexto del bebé** integrado en todas las consultas
- **Predicciones de salud** basadas en patrones históricos
- **Preguntas inteligentes** que evitan redundancia
 - **Fallback local** con coordinador multiagente cuando OpenAI no está disponible

### 📱 **PWA Nativa Completa**
- **Instalación nativa** en dispositivos móviles y desktop
- **Funcionalidad offline** completa con service worker avanzado
- **Sincronización en background** cuando vuelve la conexión
- **Notificaciones push** para recordatorios importantes
- **Cache inteligente** con estrategias optimizadas

### 🎨 **Sistema de Temas Robusto**
- **Modo claro, oscuro y automático** completamente funcional
- **Variables CSS centralizadas** para consistencia total
- **Transiciones suaves** entre temas
- **Respeto por preferencias** del sistema operativo
- **Persistencia** de configuración entre sesiones

### 🔒 **Privacidad y Seguridad**
- **Datos 100% locales** con IndexedDB
- **Sin tracking** ni analytics externos
- **Encriptación local** de datos sensibles
- **Control total** del usuario sobre sus datos
- **Exportación/importación** fácil y segura

### 📊 **Dashboard Inteligente**
- **Resumen visual** del estado de salud
- **Gráficos de crecimiento** interactivos
- **Alertas predictivas** para patrones inusuales
- **Timeline visual** de todos los eventos
- **Acciones rápidas** contextuales

### 💬 **Chat Médico con IA**
- **Consultas en lenguaje natural** sobre salud infantil
- **Contexto automático** del bebé en cada consulta
- **Recomendaciones personalizadas** basadas en historial
- **Información médica confiable** y actualizada
- **Interfaz conversacional** intuitiva

## 🚀 Inicio Rápido

### Prerrequisitos
- **Node.js 18+** ([Descargar](https://nodejs.org/))
- **npm** (incluido con Node.js)
- Navegador moderno con soporte PWA

### Instalación y Ejecución

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/chimuelo-health-tracker.git
cd chimuelo-health-tracker

# Ejecutar la plataforma completa
./start_platform.sh

# O usar comandos específicos:
./start_platform.sh dev      # Desarrollo
./start_platform.sh build    # Producción
./start_platform.sh setup    # Solo instalar dependencias
./start_platform.sh worker   # Configurar Cloudflare Worker
```

Luego instala las dependencias ejecutando:

```bash
npm ci --omit=optional
```

El proyecto utiliza la versión WASM de Rollup para evitar binarios específicos de plataforma.

La aplicación estará disponible en: **http://localhost:5173**

### Configuración de OpenAI (Opcional)

Para habilitar las funciones avanzadas de IA:

1. Obtén una API key de [OpenAI](https://platform.openai.com/)
2. Configura el worker de Cloudflare (ver `CONFIGURACION_EXTERNA.md`)
3. La app funcionará con IA local si OpenAI no está disponible

## 📁 Estructura del Proyecto

```
Chimuelo/
├── 📱 frontend/                 # Aplicación React PWA
│   ├── public/                  # Assets estáticos y PWA
│   │   ├── manifest.json        # Configuración PWA completa
│   │   ├── sw.js               # Service Worker avanzado
│   │   └── icons/              # Iconos PWA
│   ├── src/
│   │   ├── components/         # Componentes React reutilizables
│   │   │   ├── TimelineErrorBoundary.tsx
│   │   │   ├── TimelineSkeleton.tsx
│   │   │   └── dashboard/      # Componentes modulares del dashboard
│   │   ├── contexts/           # Contextos React
│   │   │   ├── AuthContext.tsx
│   │   │   ├── DataContext.tsx
│   │   │   └── ThemeContext.tsx  # Sistema de temas completo
│   │   ├── pages/              # Páginas principales
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Capture.tsx
│   │   │   ├── Timeline.tsx     # Con error boundary y skeleton
│   │   │   ├── Chat.tsx
│   │   │   ├── Settings.tsx     # Configuración completa
│   │   │   └── Profile.tsx
│   │   ├── services/           # Servicios y lógica de negocio
│   │   │   ├── aiCoordinator.ts # IA context-aware
│   │   │   ├── openaiService.ts
│   │   │   ├── databaseService.ts
│   │   │   └── apiService.ts
│   │   └── styles/             # Estilos CSS centralizados
│   │       ├── themes.css      # Variables CSS globales
│   │       └── *.css           # Estilos por componente
│   └── package.json
├── ⚡ worker/                   # Cloudflare Worker
│   ├── src/
│   │   └── index.ts            # API completa con OpenAI
│   ├── tests/
│   └── wrangler.jsonc
├── 📋 DESARROLLO_ROADMAP.md     # Plan técnico completo
├── 🔧 CONFIGURACION_EXTERNA.md  # Pasos configuración externa
├── 🚀 start_platform.sh        # Script de inicio unificado
└── 📖 README.md                # Esta documentación
```

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 19.1.0** - Framework UI moderno
- **TypeScript 5.0+** - Tipado estático
- **Vite 7.0.4** - Build tool optimizado
- **React Router 7** - Navegación SPA
- **IndexedDB** - Base de datos local

### Backend/Worker
- **Cloudflare Workers** - Edge computing
- **OpenAI GPT-4** - IA avanzada
- **TypeScript** - Código tipo-seguro
- **Itty Router** - Routing ligero

### PWA & UX
- **Service Worker** - Cache y offline
- **Web App Manifest** - Instalación nativa
- **CSS Variables** - Sistema de temas
- **Responsive Design** - Adaptable a todos los dispositivos

## 🎯 Funcionalidades Clave

### 📝 Captura de Datos
- **Procesamiento con IA** de texto natural
- **Múltiples tipos** de datos (peso, altura, síntomas, etc.)
- **Validación inteligente** con sugerencias
- **Captura por voz** (en desarrollo)

### 📈 Análisis y Visualización
- **Gráficos de crecimiento** con percentiles
- **Detección de patrones** anómalos
- **Predicciones de desarrollo** basadas en datos
- **Comparación con estándares** pediátricos

### 🔔 Alertas y Recordatorios
- **Notificaciones inteligentes** para citas médicas
- **Alertas de patrones** preocupantes
- **Recordatorios de medicación**
- **Seguimiento de vacunas**

### 📤 Exportación e Integración
- **Exportación PDF** para pediatra
- **Backup automático** en la nube (opcional)
- **Importación de datos** desde otras apps
- **API para dispositivos** IoT

## 🏗️ Desarrollo y Contribución

### Scripts Disponibles

```bash
# Frontend
npm run dev          # Desarrollo con hot reload
npm run build        # Build de producción
npm run preview      # Preview de la build
npm run type-check   # Verificar tipos TypeScript

# Worker
npm run dev          # Worker en desarrollo
npm run deploy       # Desplegar a Cloudflare
npm run test         # Ejecutar tests

# Plataforma completa
./start_platform.sh dev     # Desarrollo completo
./start_platform.sh build   # Build de producción
./start_platform.sh clean   # Limpiar y reinstalar
```

### Configuración de Desarrollo

1. **Fork** el repositorio
2. **Clona** tu fork localmente
3. **Instala** dependencias: `./start_platform.sh setup`
4. **Crea** una rama para tu feature: `git checkout -b feature/nueva-funcionalidad`
5. **Desarrolla** y **commitea** tus cambios
6. **Push** y crea un **Pull Request**

### Estructura de Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: nueva funcionalidad de predicciones de IA
fix: corrección en el sistema de temas
docs: actualización del README
style: mejoras en el diseño del timeline
refactor: optimización del contexto de IA
test: tests para el service worker
```

## 📋 Roadmap de Desarrollo

### ✅ Completado (v2.5.2)
- ✅ Sistema de temas completamente funcional
- ✅ Worker de Cloudflare con OpenAI completo
- ✅ Timeline con error boundary y skeleton loading
- ✅ IA context-aware con información del bebé
- ✅ PWA completa con funcionalidad offline
- ✅ Settings con configuración avanzada
- ✅ Service worker con estrategias de cache
- ✅ Sistema de build y deployment automatizado

### 🚧 En Desarrollo (v1.1.0)
- 🔄 Dashboard modular mejorado
- 🔄 Chat con historial persistente
- 🔄 Gráficos interactivos de crecimiento
- 🔄 Sistema de alertas push
- 🔄 Captura por voz con reconocimiento

### 🎯 Planificado (v1.2.0+)
- 📱 App nativa (React Native)
- 🔐 Sincronización segura en la nube
- 👨‍⚕️ Integración con sistemas médicos
- 📊 Analytics avanzados de desarrollo
- 🌍 Soporte multi-idioma
- 📷 Análisis de imágenes con IA

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. **Lee** nuestro [Código de Conducta](CODE_OF_CONDUCT.md)
2. **Revisa** los [issues abiertos](https://github.com/tu-usuario/chimuelo/issues)
3. **Sigue** las guías de desarrollo
4. **Asegúrate** de que los tests pasen
5. **Documenta** tus cambios

### Tipos de Contribución
- 🐛 **Bug fixes**
- ✨ **Nuevas funcionalidades**
- 📝 **Documentación**
- 🎨 **Mejoras de UI/UX**
- ⚡ **Optimizaciones de rendimiento**
- 🔧 **Configuración y tooling**

## 📄 Licencia

Este proyecto está licenciado bajo la **MIT License** - ve el archivo [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- **OpenAI** por la API de GPT-4
- **Cloudflare** por Workers y infraestructura
- **React Team** por el framework
- **Vite** por las herramientas de build
- **Comunidad open source** por las librerías utilizadas

## 📞 Soporte y Contacto

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/tu-usuario/chimuelo/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/tu-usuario/chimuelo/discussions)
- 📧 **Email**: support@chimuelo.app
- 💬 **Discord**: [Servidor de la comunidad](https://discord.gg/chimuelo)

## 📊 Estado del Proyecto

- **Build Status**: ![Build](https://img.shields.io/github/workflow/status/tu-usuario/chimuelo/CI)
- **Code Coverage**: ![Coverage](https://img.shields.io/codecov/c/github/tu-usuario/chimuelo)
- **Dependencies**: ![Dependencies](https://img.shields.io/david/tu-usuario/chimuelo)
- **Last Commit**: ![Last Commit](https://img.shields.io/github/last-commit/tu-usuario/chimuelo)

---

<div align="center">

**[🏠 Inicio](#-chimuelo-health-tracker) • [🚀 Comenzar](#-inicio-rápido) • [📁 Estructura](#-estructura-del-proyecto) • [🛠️ Tecnologías](#-tecnologías-utilizadas) • [🤝 Contribuir](#-contribuir)**

Hecho con ❤️ para padres modernos que cuidan la salud de sus bebés

</div>