# Maxi Cloudflare Worker

Este Worker actúa como proxy seguro para las APIs de OpenAI y DuckDuckGo, proporcionando rate limiting, autenticación y CORS para la aplicación Maxi.

## 🚀 Quick Setup

### 1. Instalar Dependencias
```bash
cd worker
npm install
```

### 2. Configurar Variables de Entorno

#### Secrets (Datos sensibles)
```bash
# Configurar la API key de OpenAI (REQUERIDO)
npx wrangler secret put OPENAI_API_KEY

# Configurar JWT secret para autenticación
npx wrangler secret put JWT_SECRET
```

#### KV Namespace para Rate Limiting
```bash
# Crear KV namespace para rate limiting
npx wrangler kv:namespace create "RATE_LIMIT_KV"
npx wrangler kv:namespace create "RATE_LIMIT_KV" --preview

# Copiar los IDs generados y actualizar wrangler.jsonc
```

### 3. Desarrollo Local
```bash
npm run dev
```
El Worker estará disponible en `http://localhost:8787`

### 4. Desplegar a Producción
```bash
npm run deploy
```

## 📡 API Endpoints

### Health Check
```
GET /health
```

### OpenAI Extraction
```
POST /api/openai/extract
Authorization: Bearer <token>
Content-Type: application/json

{
  "input": "Maxi pesó 8.5kg hoy",
  "inputType": "text",
  "schema": { ... },
  "options": {
    "model": "gpt-4-turbo-preview",
    "temperature": 0.2,
    "maxTokens": 1024
  }
}
```

### OpenAI Chat
```
POST /api/openai/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "¿Es normal que mi bebé pese 8.5kg a los 7 meses?"}
  ],
  "context": {
    "childAge": "7 meses",
    "weight": "8.5kg"
  },
  "searchResults": [...],
  "options": {
    "model": "gpt-4o",
    "temperature": 0.7,
    "maxTokens": 2048
  }
}
```

### Web Search
```
GET /api/search?q=peso+normal+bebé+7+meses&limit=5
Authorization: Bearer <token>
```

## 🔒 Seguridad

### Rate Limits
- `/api/openai/extract`: 50 requests/hour
- `/api/openai/chat`: 100 requests/hour  
- `/api/search`: 200 requests/hour

### Autenticación
- Todos los endpoints requieren `Authorization: Bearer <token>`
- Para MVP, validación básica de token
- En producción, verificar JWT completo

### CORS
- Permite todos los orígenes (`*`) para desarrollo
- En producción, restringir a dominios específicos

## 🛠 Development

### Testing
```bash
npm test
```

### Local Development con API Real
```bash
# Asegúrate de tener OPENAI_API_KEY configurado
npm run dev

# Test health check
curl http://localhost:8787/health

# Test extraction (necesitas token válido)
curl -X POST http://localhost:8787/api/openai/extract \
  -H "Authorization: Bearer your-test-token" \
  -H "Content-Type: application/json" \
  -d '{"input":"test","inputType":"text","schema":{}}'
```

### Logs y Debugging
```bash
# Ver logs en tiempo real
npx wrangler tail

# Ver logs de producción
npx wrangler tail --env production
```

## 📦 Deployment

### Variables Requeridas
- `OPENAI_API_KEY` (secret) - Tu API key de OpenAI
- `JWT_SECRET` (secret) - Secret para verificar JWT tokens
- `RATE_LIMIT_KV` (KV namespace) - Para almacenar contadores de rate limiting

### Configuración de Producción
1. **KV Namespaces**: Crear y configurar en `wrangler.jsonc`
2. **Secrets**: Configurar con `wrangler secret put`
3. **Custom Domain**: Opcional, configurar en Cloudflare Dashboard
4. **Analytics**: Habilitado por defecto en `wrangler.jsonc`

### CI/CD
```yaml
# .github/workflows/deploy-worker.yml
name: Deploy Worker
on:
  push:
    branches: [main]
    paths: ['worker/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - working-directory: worker
        run: |
          npm install
          npm test
          npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## 🔧 Troubleshooting

### Common Issues

#### 1. "Missing OPENAI_API_KEY"
```bash
npx wrangler secret put OPENAI_API_KEY
# Pegar tu API key cuando se solicite
```

#### 2. "KV Namespace not found"
```bash
# Crear namespace
npx wrangler kv:namespace create "RATE_LIMIT_KV"
# Copiar ID a wrangler.jsonc
```

#### 3. "Rate limit exceeded"
- Check KV namespace configuration
- Verify rate limiting logic
- Clear KV data: `npx wrangler kv:key delete --namespace-id=<id> <key>`

#### 4. "CORS errors"
- Verify corsHeaders configuration
- Check if OPTIONS requests are handled
- Test with different browsers/tools

### Performance Monitoring
```bash
# Check Worker analytics
npx wrangler analytics

# Monitor errors
npx wrangler tail --format json | grep '"level":"error"'
```

## 🔄 Updates

### Worker Updates
```bash
# Deploy new version
npm run deploy

# Rollback (manual via Cloudflare Dashboard)
# Workers > maxi-worker > Deployments > Rollback
```

### Dependencies Updates
```bash
npm update
npm audit fix
```

## 📚 Documentation

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Itty Router Docs](https://itty.dev/itty-router)
- [OpenAI API Docs](https://platform.openai.com/docs/api-reference)
- [DuckDuckGo Instant Answer API](https://duckduckgo.com/api)

---

## 🚀 Next Steps

1. **Deploy Worker**: `npm run deploy`
2. **Test Endpoints**: Verificar que todas las rutas funcionen
3. **Configure Frontend**: Apuntar frontend al Worker URL
4. **Monitor Usage**: Revisar analytics y logs
5. **Optimize**: Ajustar rate limits según uso real