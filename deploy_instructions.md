# 🚀 Instrucciones de Despliegue - Maxi MVP

## 📋 Resumen del Estado Actual

He implementado las **fundaciones críticas** para tu aplicación Maxi:

### ✅ **Completado (Listo para usar)**
1. **Cloudflare Worker** - Proxy completo para OpenAI y DuckDuckGo
2. **Frontend React** - App funcional con autenticación y dashboard
3. **Routing y Navigation** - Sistema completo de rutas protegidas
4. **UI/UX Mobile-First** - Diseño responsivo y accesible
5. **API Service Layer** - Comunicación robusta con el Worker

### 🎯 **Funcionalidades MVP Implementadas**
- ✅ Autenticación mock (para desarrollo)
- ✅ Dashboard con stats y acciones rápidas
- ✅ Conectividad al Worker (health check)
- ✅ Estructura para captura, timeline, chat y perfil
- ✅ Mobile-first design con FAB
- ✅ Error boundaries y loading states

---

## 🛠 Pasos para Desplegar

### **PASO 1: Configurar y Desplegar Cloudflare Worker**

```bash
# 1. Instalar dependencias del Worker
cd worker
npm install

# 2. Configurar secretos (IMPORTANTE)
npx wrangler secret put OPENAI_API_KEY
# Pegar tu OpenAI API key cuando se solicite

npx wrangler secret put JWT_SECRET
# Pegar cualquier string largo y aleatorio (ej: tu-jwt-secret-super-seguro-123)

# 3. Crear KV namespace para rate limiting
npx wrangler kv:namespace create "RATE_LIMIT_KV"
npx wrangler kv:namespace create "RATE_LIMIT_KV" --preview

# 4. Copiar los IDs generados y actualizar wrangler.jsonc
# Ejemplo:
# "id": "abc123def456" -> actualizar en wrangler.jsonc

# 5. Desplegar Worker
npm run deploy
```

**Resultado esperado:** 
```
✨ Successfully published your Worker to the following URLs:
 • maxi-worker.your-username.workers.dev
```

### **PASO 2: Configurar Frontend**

```bash
# 1. Ir al directorio frontend
cd ../frontend

# 2. Crear archivo de environment variables
echo "VITE_WORKER_URL=https://maxi-worker.your-username.workers.dev" > .env

# 3. Instalar dependencias
npm install

# 4. Iniciar desarrollo local
npm run dev
```

### **PASO 3: Probar la Aplicación**

1. **Abrir** `http://localhost:5173` en tu navegador
2. **Login** con cualquier email y contraseña de 6+ caracteres
3. **Verificar** que aparece "Online" en el dashboard (indica conexión al Worker)
4. **Explorar** las diferentes secciones

---

## 🧪 Testing del Worker

```bash
# Test health check
curl https://maxi-worker.your-username.workers.dev/health

# Test extracción (necesitas un token válido)
curl -X POST https://maxi-worker.your-username.workers.dev/api/openai/extract \
  -H "Authorization: Bearer test-token-123456" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Maxi pesó 8.5kg hoy",
    "inputType": "text",
    "schema": {
      "type": "object",
      "properties": {
        "weight": {"type": "number"},
        "unit": {"type": "string"},
        "confidence": {"type": "number"}
      }
    }
  }'
```

---

## 🚀 Próximos Pasos (Esta Semana)

### **Prioridad Alta (Días 1-3)**
1. **Página de Captura** - Formulario para subir texto/imagen
2. **Integración IA Real** - Conectar captura con Worker
3. **Storage Local** - IndexedDB para persistir datos
4. **Timeline Funcional** - Mostrar registros reales

### **Prioridad Media (Días 4-5)**
1. **Chat Básico** - Interfaz para preguntas a IA
2. **PWA Manifest** - Instalable en móvil
3. **Service Worker** - Funcionalidad offline

---

## 📱 Features Innovadoras Listas para Implementar

### **1. Captura Inteligente**
```javascript
// Schema para extracción de peso
const weightSchema = {
  type: "object",
  properties: {
    weight: { type: "number" },
    unit: { type: "string", enum: ["kg", "g", "lb"] },
    date: { type: "string", format: "date-time" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    notes: { type: "string" }
  },
  required: ["weight", "unit", "confidence"]
};
```

### **2. Context-Aware Chat**
```javascript
// Contexto rico para IA
const chatContext = {
  childAge: "7 meses",
  recentWeight: "8.5kg",
  lastVaccine: "Hepatitis B hace 3 días",
  parentConcerns: ["irritabilidad nocturna"]
};
```

### **3. Timeline Predictivo**
- Predicción de próximas vacunas
- Alertas proactivas de desarrollo
- Recordatorios inteligentes

---

## 🔧 Troubleshooting

### **Worker no funciona**
```bash
# Verificar secrets
npx wrangler secret list

# Ver logs en tiempo real
npx wrangler tail

# Redeploy
npm run deploy
```

### **Frontend no conecta**
1. Verificar `.env` tiene la URL correcta del Worker
2. Verificar CORS en Worker (ya configurado)
3. Verificar que Worker responde en `/health`

### **OpenAI errors**
1. Verificar API key válida: `npx wrangler secret put OPENAI_API_KEY`
2. Verificar créditos en OpenAI dashboard
3. Check rate limits en Worker logs

---

## 💡 Ideas de Extensión

### **Modo Bebé Dormido**
```css
.baby-sleep-mode {
  filter: brightness(0.3) sepia(1) hue-rotate(200deg);
  transition: filter 0.5s ease;
}
```

### **Gestos Touch Avanzados**
- Swipe para navegar timeline
- Long press para acciones rápidas
- Pull-to-refresh para sync

### **IA Contextual**
- "Maxi ha estado más irritable últimamente, ¿podría ser los dientes?"
- Auto-relacionar síntomas con eventos pasados
- Sugerencias proactivas de monitoreo

---

## 🎯 Objetivos Esta Semana

1. **Día 1**: Desplegar Worker + Frontend
2. **Día 2**: Implementar captura básica
3. **Día 3**: Conectar con extracción IA
4. **Día 4**: Timeline con datos reales
5. **Día 5**: Chat básico funcional

**Al final de la semana tendrás**: Una app completamente funcional para capturar datos de salud, procesarlos con IA, y visualizarlos en un timeline!

---

¿Listo para empezar? 🚀

1. **Primero**: Configura el Worker siguiendo el PASO 1
2. **Luego**: Avísame cuando esté funcionando para continuar con el frontend
3. **Después**: Implementaremos las funcionalidades core una por una

¡Tu app Maxi va a estar increíble! 👶✨