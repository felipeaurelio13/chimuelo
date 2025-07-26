# Guía de Despliegue - Maxi

## Configuración de GitHub Secrets

Para que la aplicación funcione correctamente en producción, necesitas configurar los siguientes secrets en tu repositorio de GitHub:

### 1. OpenAI API Key (CRÍTICO)

**⚠️ IMPORTANTE**: La API key de OpenAI debe configurarse como GitHub Secret, NO como variable de entorno pública.

1. Ve a tu repositorio en GitHub
2. Navega a `Settings > Secrets and variables > Actions`
3. Haz clic en `New repository secret`
4. Configura estos secrets:

```
Nombre: OPENAI_API_KEY
Valor: tu_api_key_de_openai_aquí
```

```
Nombre: CLOUDFLARE_API_TOKEN
Valor: tu_token_de_cloudflare_aquí
```

```
Nombre: JWT_SECRET
Valor: una_cadena_secreta_aleatoria_para_jwt
```

### 2. Obtener las claves necesarias

#### OpenAI API Key
1. Ve a [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Crea una nueva API key
3. Cópiala y guárdala como `OPENAI_API_KEY` en GitHub Secrets

#### Cloudflare API Token
1. Ve a [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Crea un token con permisos para Cloudflare Workers
3. Cópialo y guárdalo como `CLOUDFLARE_API_TOKEN` en GitHub Secrets

#### JWT Secret
1. Genera una cadena aleatoria segura (puedes usar: `openssl rand -base64 32`)
2. Guárdala como `JWT_SECRET` en GitHub Secrets

### 3. Configuración del Worker de Cloudflare

El worker está configurado en `worker/wrangler.jsonc`. Asegúrate de:

1. Tener una cuenta de Cloudflare
2. El dominio del worker configurado correctamente
3. KV namespace creado para rate limiting

### 4. Despliegue Automático

Una vez configurados los secrets, cada push a `main` o `master` desplegará automáticamente:

1. **Frontend**: A GitHub Pages
2. **Worker**: A Cloudflare Workers

### 5. Variables de Entorno Locales

Para desarrollo local, crea un archivo `.env` en la carpeta `worker/`:

```env
OPENAI_API_KEY=tu_api_key_aquí
JWT_SECRET=tu_jwt_secret_aquí
```

**⚠️ NUNCA comitees el archivo `.env` al repositorio**

## Verificación del Despliegue

### Frontend
- URL: `https://[tu-usuario].github.io/[tu-repo]/`
- Verifica que la página de login carga correctamente

### Worker
- URL: `https://[tu-worker].[tu-subdominio].workers.dev/health`
- Debe devolver: `{"success": true, "message": "Maxi Worker is healthy"}`

### Flujo de Login
1. Usa las credenciales demo: `felipelorcac@gmail.com` / `phil.13`
2. O crea una nueva cuenta en `/register`
3. Verifica que puedes acceder al dashboard

## Solución de Problemas

### Error: "OpenAI API error"
- Verifica que `OPENAI_API_KEY` esté configurado correctamente en GitHub Secrets
- Asegúrate de que la API key tenga créditos disponibles

### Error: "Unauthorized"
- Verifica que `JWT_SECRET` esté configurado
- Revisa que el worker esté desplegado correctamente

### Error de CORS
- Verifica que el worker esté en la misma red que el frontend
- Revisa la configuración de CORS en `worker/src/index.ts`

## Monitoreo

### Logs del Worker
```bash
cd worker
npx wrangler tail
```

### Analytics
- Ve al dashboard de Cloudflare Workers para métricas
- Revisa GitHub Actions para logs de despliegue