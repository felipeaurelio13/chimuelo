# 🗺️ Roadmap de Mejoras - Chimuelo Health Tracker

## 📋 Resumen de Problemas Identificados

### 1. **Estilo y Usabilidad de Settings** 🎨
- La página de configuración necesita un diseño coherente con el resto de la plataforma
- Falta consistencia visual con los demás componentes

### 2. **Modo Claro/Oscuro Inconsistente** 🌓
- El modo oscuro no se aplica de manera coherente en toda la plataforma
- No hay implementación de modo claro
- Falta un sistema de temas centralizado

### 3. **Error en Timeline** 🐛
- Al entrar al timeline aparece un error que pide recargar
- Al recargar, lleva a una página de error
- Problemas con las rutas y manejo de errores

### 4. **Inteligencia del Sistema** 🧠
- La IA pregunta por información que ya tiene (ej: fecha de nacimiento)
- Respuestas incorrectas (detecta síntomas cuando se habla de altura)
- Respuestas demasiado instantáneas - no parece haber procesamiento real

### 5. **Flujo de Rutas** 🛤️
- Revisar todas las rutas y navegación
- Mejorar manejo de errores
- Verificar redirecciones

## 🚀 Plan de Implementación

### Fase 1: Sistema de Temas Centralizado (2 horas)

#### 1.1 Crear Context de Temas
```typescript
// src/contexts/ThemeContext.tsx
- Implementar light/dark/system modes
- Persistencia en localStorage
- Detección de preferencia del sistema
- Hook useTheme() para consumir
```

#### 1.2 Variables CSS Centralizadas
```css
/* src/styles/themes.css */
:root {
  /* Light theme */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #212529;
  /* ... más variables */
}

[data-theme="dark"] {
  /* Dark theme */
  --bg-primary: #121212;
  --bg-secondary: #1e1e1e;
  --text-primary: #e0e0e0;
  /* ... más variables */
}
```

#### 1.3 Implementar color-scheme nativo
- Usar `color-scheme: light dark` para UI nativa del navegador
- Aplicar en formularios, scrollbars, etc.

### Fase 2: Rediseño de Settings (1.5 horas)

#### 2.1 Nueva UI de Settings
- Diseño coherente con el resto de la app
- Secciones organizadas: Perfil, Temas, Datos, Privacidad
- Toggle elegante para dark/light/system
- Preview en tiempo real del tema

#### 2.2 Funcionalidades
- Editar perfil del bebé
- Cambiar unidades (kg/lb, cm/in)
- Exportar/importar datos
- Borrar datos con confirmación

### Fase 3: Corregir Timeline y Rutas (2 horas)

#### 3.1 Debugging del Timeline
- Identificar causa del error
- Verificar carga de datos desde localStorage
- Implementar skeleton loader mientras carga

#### 3.2 Sistema de Rutas Robusto
```typescript
// src/routes/AppRoutes.tsx
- Implementar ErrorBoundary global
- Páginas 404 personalizadas
- Redirecciones inteligentes
- Lazy loading de componentes
```

#### 3.3 Manejo de Errores
- Componente ErrorFallback amigable
- Botón "Volver al inicio" funcional
- Logging de errores para debugging

### Fase 4: Mejorar Inteligencia de IA (3 horas)

#### 4.1 Context Awareness
```typescript
// src/services/aiAgents.ts
class ContextAwareAgent {
  // Acceder a DataContext para conocer info existente
  // No preguntar por datos que ya tenemos
  // Usar fecha de nacimiento del perfil
}
```

#### 4.2 Procesamiento Realista
- Añadir delays artificiales (300-800ms)
- Animación de "pensando" con pasos visibles
- Mostrar qué agente está procesando

#### 4.3 Mejor Análisis de Texto
```typescript
// Mejorar detección de contexto
- Si detecta "nació" o "nacimiento" → buscar medidas iniciales
- Si detecta "mide/midió" → buscar altura, no síntomas
- Validar contexto antes de clasificar
```

#### 4.4 Memoria Conversacional
- Mantener contexto de conversaciones previas
- No repetir preguntas ya respondidas
- Sugerir basado en historial

### Fase 5: Optimizaciones y Polish (1.5 horas)

#### 5.1 Performance
- Implementar React.memo donde sea necesario
- Lazy loading de componentes pesados
- Optimizar re-renders del tema

#### 5.2 Accesibilidad
- ARIA labels en todos los botones
- Contraste WCAG AAA en ambos temas
- Focus visible en navegación con teclado

#### 5.3 PWA Mejorada
- Actualizar manifest.json con temas
- Service worker con cache inteligente
- Solicitar instalación después de 3 usos

## 📝 Implementación Detallada

### Sistema de Temas

#### ThemeContext.tsx
```typescript
interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

// Detectar preferencia del sistema
// Aplicar tema antes del render (evitar FOUC)
// Sincronizar con color-scheme CSS
```

#### Componente ThemeToggle
```tsx
// Botón triestado: light/dark/system
// Iconos: ☀️/🌙/🖥️
// Transición suave entre temas
```

### Settings Page Mejorada

#### Estructura
```
Settings
├── Profile Section
│   ├── Baby name
│   ├── Birth date
│   ├── Initial measurements
│   └── Photo
├── Appearance
│   ├── Theme toggle
│   ├── Font size
│   └── Accent color
├── Data & Privacy
│   ├── Export data
│   ├── Import backup
│   └── Clear all data
└── About
    ├── Version
    ├── Help
    └── Contact
```

### Timeline Fix

#### Diagnóstico
1. Verificar si hay datos en localStorage
2. Validar estructura de datos
3. Manejar casos edge (sin datos)
4. Implementar estado de carga

#### Solución
```typescript
// Timeline.tsx
const Timeline = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    try {
      // Cargar datos con validación
      const data = loadTimelineData();
      if (!data || data.length === 0) {
        // Mostrar estado vacío, no error
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);
}
```

### IA Mejorada

#### Sistema de Contexto
```typescript
class AIContextManager {
  private userProfile: UserProfile;
  private conversationHistory: Message[];
  
  async processWithContext(input: string) {
    // 1. Cargar perfil y datos existentes
    // 2. Analizar qué información ya tenemos
    // 3. Solo preguntar lo que falta
    // 4. Usar fechas relativas al nacimiento
  }
}
```

#### Delays Realistas
```typescript
const simulateProcessing = async (steps: string[]) => {
  for (const step of steps) {
    showProcessingStep(step);
    await delay(300 + Math.random() * 500);
  }
};
```

## 🎯 Métricas de Éxito

1. **Temas**: Cambio instantáneo sin FOUC
2. **Settings**: Usuario puede editar todo sin fricciones
3. **Timeline**: Carga sin errores, maneja estados vacíos
4. **IA**: No repite preguntas, contexto correcto
5. **Performance**: Todo carga en < 2s

## 🔄 Orden de Implementación

1. **Primero**: Sistema de temas (base para todo)
2. **Segundo**: Fix del Timeline (crítico)
3. **Tercero**: Settings page (UX importante)
4. **Cuarto**: Mejoras de IA (diferenciador)
5. **Último**: Polish y optimizaciones

## 🚦 Estado Actual

- [ ] Sistema de Temas Centralizado
- [ ] Rediseño de Settings
- [ ] Corrección de Timeline
- [ ] Mejoras de Inteligencia IA
- [ ] Optimizaciones Finales

---

**Tiempo estimado total**: 10 horas
**Prioridad**: Alta - Afecta UX crítica
**Dependencias**: Ninguna externa