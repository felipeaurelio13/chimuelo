# Configuración de OpenAI API

## ⚠️ IMPORTANTE: Seguridad de la API Key

**NUNCA** expongas tu API key de OpenAI en:
- El código fuente
- Commits de Git
- Issues o comentarios públicos
- Archivos no protegidos

Si tu API key se expone públicamente, OpenAI la revocará automáticamente.

## Configuración Local

1. **Crea un archivo `.env` en la carpeta `frontend/`**:
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. **Edita el archivo `.env` y agrega tu API key**:
   ```
   VITE_OPENAI_API_KEY=tu-api-key-aqui
   ```

3. **Verifica que `.env` esté en `.gitignore`** (ya está configurado)

## Configuración en Producción (GitHub Pages)

GitHub Pages NO soporta variables de entorno del servidor. Para usar OpenAI en producción, tienes estas opciones:

### Opción 1: Proxy Server (Recomendada)
1. Crea un servidor backend (Node.js, Python, etc.)
2. El servidor mantiene la API key de forma segura
3. Tu app frontend llama a tu servidor, no directamente a OpenAI

### Opción 2: Función Serverless
1. Usa Vercel, Netlify Functions, o AWS Lambda
2. La función mantiene la API key
3. Tu app llama a la función

### Opción 3: Modo Offline (Actual)
La app funciona sin OpenAI usando procesamiento local. Esta es la configuración actual para GitHub Pages.

## Características con/sin OpenAI

### Con OpenAI:
- ✅ Análisis más preciso de texto médico
- ✅ Soporte para análisis de imágenes (GPT-4 Vision)
- ✅ Mejor comprensión del contexto
- ✅ Respuestas más naturales

### Sin OpenAI (Modo Offline):
- ✅ Funciona completamente offline
- ✅ Procesamiento local con reglas
- ✅ Sin costos de API
- ✅ Privacidad total
- ❌ Menos precisión en casos complejos
- ❌ No analiza imágenes

## Obtener una API Key

1. Ve a https://platform.openai.com/api-keys
2. Crea una cuenta o inicia sesión
3. Genera una nueva API key
4. Copia la key inmediatamente (no se muestra de nuevo)
5. Configura límites de uso para evitar sorpresas

## Costos Estimados

- GPT-4 Turbo: ~$0.01 por análisis de texto
- GPT-4 Vision: ~$0.03 por análisis de imagen
- Uso típico: $5-10/mes para uso personal

## Solución de Problemas

### "OpenAI no está configurado"
- Verifica que el archivo `.env` existe
- Verifica que la key es correcta
- Reinicia el servidor de desarrollo

### "Invalid API key"
- La key puede estar revocada
- Genera una nueva en OpenAI
- Verifica que no hay espacios extras

### "Rate limit exceeded"
- Espera unos minutos
- Considera actualizar tu plan
- Implementa caché local