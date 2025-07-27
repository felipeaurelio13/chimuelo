# 🌩️ Guía para Crear Token de Cloudflare Correcto

## ❌ Problema Actual
Error: `Unable to authenticate request [code: 10001]`

Esto indica que el `CLOUDFLARE_API_TOKEN` no es válido o no tiene los permisos necesarios.

## ✅ Solución: Crear Token Correcto

### 1. Ve al Dashboard de Cloudflare
🔗 **URL**: https://dash.cloudflare.com/profile/api-tokens

### 2. Haz Clic en "Create Token"
- **NO uses** "Global API Key"
- **USA** "Custom Token"

### 3. Configuración del Token

#### **Token Name:**
```
GitHub-Actions-Worker-Deploy
```

#### **Permissions (Permisos):**
```
Zone:Zone Settings:Read
Zone:Zone:Read  
Account:Cloudflare Workers:Edit
Account:Account:Read
User:User Details:Read
```

#### **Account Resources:**
```
Include: All accounts
```

#### **Zone Resources:**
```
Include: All zones
```

### 4. Configuración Específica Requerida

**⚠️ IMPORTANTE**: Asegúrate de incluir estos permisos exactos:

1. **Account: Cloudflare Workers: Edit** ← MUY IMPORTANTE
2. **Account: Account: Read** ← NECESARIO
3. **Zone: Zone: Read** ← Para verificar dominios
4. **Zone: Zone Settings: Read** ← Para configuración
5. **User: User Details: Read** ← Para autenticación

### 5. Crear y Copiar Token

1. Haz clic en **"Continue to Summary"**
2. Revisa que los permisos sean correctos
3. Haz clic en **"Create Token"**
4. **COPIA EL TOKEN INMEDIATAMENTE** (solo se muestra una vez)

### 6. Actualizar en GitHub

1. Ve a tu repositorio en GitHub
2. **Settings** → **Security** → **Secrets and variables** → **Actions**
3. Busca `CLOUDFLARE_API_TOKEN`
4. Haz clic en el ícono de editar (lápiz)
5. Pega el nuevo token
6. Haz clic en **"Update secret"**

## 🔍 Verificar Token

Para verificar que el token funciona, puedes usar esta URL:
```
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
     -H "Authorization: Bearer TU_TOKEN_AQUI" \
     -H "Content-Type: application/json"
```

## 🚨 Problemas Comunes

### Token Global API Key vs Custom Token
- ❌ **NO uses** "Global API Key" 
- ✅ **USA** "Custom Token"

### Permisos Insuficientes
Si el error persiste, puede ser que falten permisos:
- Verifica que incluiste **"Account: Cloudflare Workers: Edit"**
- Asegúrate de incluir **"Account: Account: Read"**

### Token Expirado
- Los tokens custom pueden tener fecha de expiración
- Verifica la fecha de expiración en Cloudflare Dashboard

## 🎯 Configuración Recomendada

**Template de Token Personalizado:**
```yaml
Token Name: GitHub-Actions-Worker-Deploy
Permissions:
  - Zone:Zone Settings:Read
  - Zone:Zone:Read  
  - Account:Cloudflare Workers:Edit
  - Account:Account:Read
  - User:User Details:Read
Account Resources: Include All accounts
Zone Resources: Include All zones
TTL: No expiry (o fecha específica si prefieres)
```

## ✅ Una vez Actualizado

1. Ve a **Actions** en GitHub
2. **Re-run** el último workflow fallido
3. Debería funcionar con el nuevo token

---

**Nota**: El token debe ser específicamente un **Custom API Token**, no el Global API Key.