# 🦷 Chimuelo - Plataforma Inteligente de Salud Infantil

> Plataforma completa de seguimiento de salud infantil con IA, captura multimodal, timeline predictivo y asistente médico contextual.

[![Deploy Status](https://github.com/felipeaurelio13/chimuelo/actions/workflows/deploy.yml/badge.svg)](https://github.com/felipeaurelio13/chimuelo/actions)
[![Live Demo](https://img.shields.io/badge/demo-live-green)](https://felipeaurelio13.github.io/chimuelo/)

## 🌟 Características Principales

### 🎤 **Captura Inteligente Multimodal**
- Registro por voz con extracción automática de datos
- Subida de imágenes (recetas, informes médicos)
- Texto libre con análisis contextual de IA
- Grabación de audio en tiempo real
- Soporte para archivos PDF

### 📊 **Timeline Predictivo**
- Cronología completa del historial médico
- Predicciones de crecimiento con IA
- Análisis de patrones de desarrollo
- Alertas automáticas proactivas
- Filtros inteligentes por tipo y fecha

### 💬 **Asistente Médico IA**
- Chat contextual con historial completo
- Búsqueda web integrada para información actualizada
- Sugerencias inteligentes de preguntas
- Respuestas basadas en el contexto médico del niño

### 🏠 **Dashboard Proactivo**
- Resumen ejecutivo de salud en tiempo real
- Alertas urgentes priorizadas
- Estadísticas visuales interactivas
- Accesos rápidos a funcionalidades clave

### ⚙️ **Configuración Avanzada**
- Gestión completa de datos (exportar/limpiar)
- Configuración de unidades y preferencias
- Modos de interfaz (incluyendo "baby mode")
- Configuraciones de privacidad y seguridad

## 🚀 Tecnologías

### Frontend
- **React 18** + **TypeScript** - UI moderna y tipada
- **Vite** - Build tool ultrarrápido
- **PWA** - Funciona offline y se instala como app
- **IndexedDB** - Storage local robusto
- **React Router** - Navegación SPA

### Backend & IA
- **Cloudflare Worker** - API proxy sin servidor
- **OpenAI GPT-4** - Procesamiento de lenguaje natural
- **DuckDuckGo API** - Búsqueda web integrada

### Seguridad & Storage
- **IndexedDB** con encriptación local
- **JWT** para autenticación
- **Rate limiting** y CORS
- **GitHub Gist** para backup remoto (planificado)

## 📱 Uso Local

### Prerrequisitos
- Node.js 18+
- npm o yarn

### 🔧 Instalación y Desarrollo

```bash
# 1. Clonar el repositorio
git clone https://github.com/felipeaurelio13/chimuelo.git
cd chimuelo

# 2. Instalar dependencias del frontend
cd frontend
npm install

# 3. Iniciar servidor de desarrollo
npm run dev

# 4. Abrir en el navegador
# La app estará disponible en: http://localhost:5173
```

### 🏗️ Build para Producción

```bash
cd frontend
npm run build

# Los archivos se generarán en: frontend/dist/
```

### 🧪 Testing

```bash
# Ejecutar tests
npm run test

# Coverage
npm run test:coverage
```

## 🌐 Deployment

### GitHub Pages (Automático)
La aplicación se despliega automáticamente en GitHub Pages cuando se hace push a `main`:

**🔗 URL Live**: https://felipeaurelio13.github.io/chimuelo/

### Worker Cloudflare (Opcional)
Para funcionalidad completa de IA:

```bash
cd worker
npx wrangler login
npx wrangler secret put OPENAI_API_KEY
npx wrangler deploy
```

## 📋 Funcionalidades por Implementar

### Fase 1: ✅ Completada
- [x] Autenticación básica
- [x] Captura multimodal
- [x] Timeline inteligente
- [x] Chat con IA
- [x] Dashboard proactivo
- [x] Configuración avanzada

### Fase 2: 🔄 En Progreso
- [ ] Encriptación end-to-end
- [ ] Sincronización con GitHub Gist
- [ ] Notificaciones push
- [ ] Modo offline completo

### Fase 3: 📋 Planificada
- [ ] Integración con wearables
- [ ] Exportación a PDF
- [ ] Compartir con médicos
- [ ] Análisis avanzados de IA

## 🎯 Casos de Uso

### Para Padres
- **Registro rápido**: "Mi bebé pesó 3.2kg en el último control"
- **Consulta médica**: "¿Es normal que tenga fiebre de 38°C?"
- **Seguimiento**: Ver toda la evolución de peso y talla

### Para Cuidadores
- **Historial completo**: Acceso a todo el historial médico
- **Alertas importantes**: Notificaciones de vacunas pendientes
- **Comunicación**: Chat con IA para dudas inmediatas

## 🔐 Privacidad y Seguridad

- **Datos locales**: Todo se almacena en tu dispositivo
- **Encriptación**: Datos sensibles encriptados
- **Sin tracking**: No recopilamos datos personales
- **Open source**: Código completamente auditable

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 👨‍💻 Autor

**Felipe Aurelio** - [@felipeaurelio13](https://github.com/felipeaurelio13)

---

**📱 ¿Te gusta Chimuelo?** Dale una ⭐ en GitHub y compártelo con otros padres!