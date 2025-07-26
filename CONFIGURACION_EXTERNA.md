# 🔧 CONFIGURACIÓN EXTERNA REQUERIDA

## Pasos que DEBES hacer manualmente en otras plataformas

---

## 📡 CLOUDFLARE WORKER - CONFIGURACIÓN COMPLETA

### Paso 1: Configurar Variables de Entorno
```bash
# Navegar al directorio del worker
cd worker

# Configurar la API key de OpenAI (CRÍTICO)
npx wrangler secret put OPENAI_API_KEY
# Cuando te pregunte, pega tu clave: sk-...

# Configurar JWT secret para autenticación
npx wrangler secret put JWT_SECRET
# Cuando te pregunte, usa algo como: chimuelo-jwt-secret-2024-super-secure

# (Opcional) Configurar variables públicas
npx wrangler kv:namespace create "RATE_LIMIT_KV"
npx wrangler kv:namespace create "RATE_LIMIT_KV" --preview
```

### Paso 2: Actualizar wrangler.jsonc
```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "chimuelo-worker",
  "main": "src/index.ts",
  "compatibility_date": "2025-01-24",
  "observability": {
    "enabled": true
  },
  "compatibility_flags": [
    "nodejs_compat"
  ],
  "vars": {
    "ENVIRONMENT": "production"
  },
  "kv_namespaces": [
    {
      "binding": "RATE_LIMIT_KV",
      "id": "AQUÍ_VA_EL_ID_GENERADO_EN_PASO_1",
      "preview_id": "AQUÍ_VA_EL_PREVIEW_ID_GENERADO_EN_PASO_1"
    }
  ]
}
```

### Paso 3: Desplegar el Worker
```bash
# Desplegar a producción
npx wrangler deploy

# Verificar que está funcionando
curl https://chimuelo-worker.TU-USUARIO.workers.dev/health
```

---

## 🔑 OPENAI - CONFIGURACIÓN DE API

### Paso 1: Obtener API Key
1. Ve a https://platform.openai.com/
2. Inicia sesión o crea una cuenta
3. Ve a "API Keys" en el panel izquierdo
4. Crea una nueva API key
5. **IMPORTANTE**: Copia la clave inmediatamente (no la podrás ver de nuevo)
6. Guárdala de forma segura

### Paso 2: Configurar Límites y Billing
1. Ve a "Settings" > "Billing"
2. Agrega un método de pago
3. Establece límites de uso:
   - **Hard limit**: $20/mes (recomendado para desarrollo)
   - **Soft limit**: $15/mes
4. Ve a "Settings" > "Rate limits"
5. Configura límites por modelo:
   - **gpt-4-turbo-preview**: 500 requests/day
   - **gpt-3.5-turbo**: 3,000 requests/day

### Paso 3: Configurar Variables de Entorno Locales
```bash
# En el directorio frontend
echo "VITE_OPENAI_API_KEY=tu-clave-aqui" >> .env.local
echo "VITE_WORKER_URL=https://chimuelo-worker.TU-USUARIO.workers.dev" >> .env.local

# Agregar a .gitignore
echo ".env.local" >> .gitignore
```

---

## 🚀 GITHUB PAGES - CONFIGURACIÓN DE DEPLOYMENT

### Paso 1: Configurar GitHub Actions
Crear archivo `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Build
      run: |
        cd frontend
        npm run build
      env:
        VITE_WORKER_URL: https://chimuelo-worker.TU-USUARIO.workers.dev
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./frontend/dist
```

### Paso 2: Habilitar GitHub Pages
1. Ve a tu repositorio en GitHub
2. Clic en "Settings"
3. Scroll hacia abajo a "Pages"
4. En "Source", selecciona "GitHub Actions"
5. Guarda la configuración

### Paso 3: Configurar Custom Domain (Opcional)
Si tienes un dominio propio:
1. En "Pages" > "Custom domain"
2. Ingresa tu dominio: `chimuelo.tudominio.com`
3. Habilita "Enforce HTTPS"
4. Configura DNS en tu proveedor:
   ```
   CNAME chimuelo TU-USUARIO.github.io
   ```

---

## 🔐 CONFIGURACIÓN DE SEGURIDAD

### Paso 1: Variables de Entorno Seguras
```bash
# NUNCA commitees estas claves al repositorio
# Usar siempre .env.local para desarrollo

# Producción: usar GitHub Secrets
# Ve a tu repo > Settings > Secrets and variables > Actions
# Agregar secrets:
# - OPENAI_API_KEY
# - CLOUDFLARE_API_TOKEN (si usas CI/CD para worker)
```

### Paso 2: Configurar CORS en Worker
```typescript
// En worker/src/index.ts - ya incluido en el roadmap
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://TU-USUARIO.github.io',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

---

## 📊 MONITOREO Y ANALYTICS (Opcional)

### Paso 1: Configurar Sentry para Error Tracking
1. Ve a https://sentry.io/
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto "React"
4. Copia el DSN
5. Agrega a tu .env.local:
   ```
   VITE_SENTRY_DSN=https://...@sentry.io/...
   ```

### Paso 2: Configurar Google Analytics (Opcional)
1. Ve a https://analytics.google.com/
2. Crea una propiedad para tu app
3. Copia el Measurement ID
4. Agrega a tu .env.local:
   ```
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

---

## 🧪 TESTING EN CLOUDFLARE

### Verificar que todo funciona:
```bash
# 1. Test del worker
curl https://chimuelo-worker.TU-USUARIO.workers.dev/health

# 2. Test de OpenAI (reemplaza con tu token de test)
curl -X POST https://chimuelo-worker.TU-USUARIO.workers.dev/api/openai/extract \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"input":"Maxi pesó 8.5kg","inputType":"text"}'

# 3. Test de la app desplegada
# Ve a https://TU-USUARIO.github.io/chimuelo/
```

---

## ⚠️ PROBLEMAS COMUNES Y SOLUCIONES

### Error: "Worker script not found"
```bash
# Solución: Verificar que el build fue exitoso
cd worker
npm run build
npx wrangler deploy
```

### Error: "OpenAI API rate limit"
```bash
# Solución: Verificar límites en OpenAI dashboard
# Esperar o upgradeear el plan
```

### Error: "CORS policy error"
```bash
# Solución: Verificar que corsHeaders incluye tu dominio
# En desarrollo: usar http://localhost:5173
# En producción: usar https://TU-USUARIO.github.io
```

### Error: "GitHub Pages not updating"
```bash
# Solución: 
# 1. Verificar que el workflow corrió sin errores
# 2. Check Actions tab en GitHub
# 3. Verificar que el branch es 'main'
```

---

## 📝 CHECKLIST FINAL

### Antes de comenzar el desarrollo:
- [ ] OpenAI API key configurada y con billing
- [ ] Worker desplegado en Cloudflare con secrets
- [ ] GitHub Actions configurado para auto-deploy
- [ ] Variables de entorno locales configuradas
- [ ] CORS configurado correctamente
- [ ] (Opcional) Sentry configurado para monitoring

### Verificaciones de funcionalidad:
- [ ] Worker responde en `/health`
- [ ] App se despliega automáticamente en push
- [ ] Tema oscuro/claro funciona
- [ ] IA responde (aunque sea mock data inicialmente)
- [ ] Timeline carga sin errores

---

## 🆘 SOPORTE

Si encuentras problemas:

1. **Worker Issues**: Revisa logs con `npx wrangler tail`
2. **OpenAI Issues**: Verifica usage en OpenAI dashboard
3. **GitHub Pages**: Revisa Actions tab para errores de build
4. **CORS Issues**: Verifica configuración de dominios

**Recursos útiles:**
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [GitHub Pages Docs](https://docs.github.com/pages)

Una vez completados estos pasos, la plataforma estará lista para el desarrollo siguiendo el DESARROLLO_ROADMAP.md 🎯