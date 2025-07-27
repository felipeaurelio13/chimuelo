# 🔐 Configuración de Secretos para Deployment - Chimuelo

Esta guía te llevará paso a paso para configurar todos los secretos necesarios en GitHub para que el deployment funcione correctamente.

## 📋 Secretos Requeridos

Necesitas configurar los siguientes secretos en tu repositorio de GitHub:

### 1. 🌩️ Cloudflare (Worker)
```
CLOUDFLARE_API_TOKEN
OPENAI_API_KEY  
JWT_SECRET
```

### 2. 🤖 OpenAI (Para el Worker)
```
OPENAI_API_KEY (mismo que arriba)
```

## 🚀 Paso a Paso para Configurar Secretos

### 1. Acceder a la Configuración de Secretos

1. Ve a tu repositorio en GitHub: `https://github.com/felipeaurelio13/chimuelo`
2. Haz clic en **Settings** (Configuración)
3. En la barra lateral izquierda, busca la sección **Security**
4. Haz clic en **Secrets and variables**
5. Selecciona **Actions**

### 2. 🌩️ Configurar CLOUDFLARE_API_TOKEN

**¿Qué es?** Token para permitir que GitHub Actions despliegue tu Worker a Cloudflare.

**Cómo obtenerlo:**
1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Haz clic en **Create Token**
3. Usa la plantilla **Custom Token**
4. Configura los permisos:
   - **Zone:Zone Settings:Read**
   - **Zone:Zone:Read** 
   - **Account:Cloudflare Workers:Edit**
5. En **Zone Resources**, selecciona **Include - All zones**
6. Haz clic en **Continue to Summary** y luego **Create Token**
7. Copia el token generado

**En GitHub:**
- **Name**: `CLOUDFLARE_API_TOKEN`
- **Secret**: Pega el token que copiaste

### 3. 🤖 Configurar OPENAI_API_KEY

**¿Qué es?** Tu clave de API de OpenAI para usar GPT-4 en el Worker.

**Cómo obtenerlo:**
1. Ve a [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Inicia sesión en tu cuenta de OpenAI
3. Haz clic en **Create new secret key**
4. Dale un nombre (ej: "Chimuelo Production")
5. Copia la clave generada (⚠️ solo se muestra una vez)

**En GitHub:**
- **Name**: `OPENAI_API_KEY`
- **Secret**: Pega tu clave de OpenAI (ej: `sk-proj-...`)

### 4. 🔒 Configurar JWT_SECRET

**¿Qué es?** Una cadena secreta para firmar tokens JWT en tu aplicación.

**Cómo generarlo:**
Puedes usar cualquiera de estos métodos:

**Opción A - Online (fácil):**
1. Ve a [JWT Secret Generator](https://jwtsecret.com/)
2. Copia el secreto generado

**Opción B - Terminal (recomendado):**
```bash
openssl rand -base64 32
```

**Opción C - Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**En GitHub:**
- **Name**: `JWT_SECRET`
- **Secret**: Pega el secreto generado (ej: `abc123xyz...`)

## ✅ Verificación de Configuración

Una vez configurados todos los secretos, deberías ver en GitHub Actions > Secrets:

```
✅ CLOUDFLARE_API_TOKEN  (Added X minutes ago)
✅ OPENAI_API_KEY        (Added X minutes ago)  
✅ JWT_SECRET            (Added X minutes ago)
```

## 🔍 Testing del Deployment

Para verificar que todo funciona:

1. Ve a **Actions** en tu repositorio
2. Busca el workflow **"Deploy to GitHub Pages"**
3. Debería estar ejecutándose automáticamente después del último push
4. Si hay errores, revisa los logs y verifica que los secretos estén configurados correctamente

## 📱 URLs de Acceso

Una vez desplegado exitosamente:

- **Frontend**: `https://felipeaurelio13.github.io/chimuelo/`
- **Worker API**: `https://maxi-worker.felipeaurelio13.workers.dev/`
- **Health Check**: `https://maxi-worker.felipeaurelio13.workers.dev/health`

## 🛠️ Troubleshooting

### ❌ Error: "OpenAI API key not configured"
- Verifica que `OPENAI_API_KEY` esté configurado en GitHub Secrets
- Asegúrate de que la clave sea válida y tenga créditos

### ❌ Error: "Cloudflare API token invalid"
- Verifica que `CLOUDFLARE_API_TOKEN` tenga los permisos correctos
- Asegúrate de que el token no haya expirado

### ❌ Error: "JWT Secret missing"
- Confirma que `JWT_SECRET` esté configurado
- Verifica que sea una cadena de al menos 32 caracteres

### ❌ Deployment falla
1. Ve a **Actions** en GitHub
2. Haz clic en el workflow fallido
3. Revisa los logs detallados
4. Los errores más comunes son secretos mal configurados

## 🔄 Flujo de Deployment Automático

Tu deployment está configurado para:

1. **Trigger**: Push a `main` branch
2. **Build**: Compila el frontend (React + TypeScript)
3. **Deploy Worker**: Despliega el Worker a Cloudflare
4. **Deploy Frontend**: Despliega a GitHub Pages
5. **Concurrent**: Ambos deployments ocurren en paralelo

## 🎯 Próximos Pasos

Una vez que los secretos estén configurados y el deployment sea exitoso:

1. ✅ Prueba la aplicación en production
2. ✅ Verifica que la API del Worker responda
3. ✅ Confirma que OpenAI funcione correctamente
4. ✅ Prueba el login/registro
5. ✅ Verifica que las PWA features funcionen

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs en GitHub Actions
2. Verifica que todos los secretos estén configurados
3. Confirma que las URLs de la API sean correctas
4. Prueba el Worker directamente en su URL

---

**¡Todo listo!** 🚀 Una vez configurados los secretos, tu aplicación se desplegará automáticamente con cada push a main.