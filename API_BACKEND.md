# Documentación de la API Backend — Maxi

## Autenticación
- Todas las rutas requieren JWT en el header `Authorization: Bearer <token>`.

---

## Endpoints principales

### Usuarios
- `POST /api/auth/register` — Registro de usuario
- `POST /api/auth/login` — Login de usuario
- `GET /api/auth/profile` — Perfil del usuario autenticado
- `PUT /api/auth/profile` — Actualizar perfil

### Gestión de niños
- `GET /api/children` — Listar hijos del usuario
- `POST /api/children` — Crear nuevo hijo

### Registros de salud
- `GET /api/children/<child_id>/records` — Listar registros de salud de un niño
- `POST /api/children/<child_id>/records` — Crear registro de salud

### Chat e insights
- `GET /api/children/<child_id>/chat` — Historial de chat IA
- `POST /api/children/<child_id>/chat` — Guardar mensaje de chat
- `GET /api/children/<child_id>/insights` — Insights y alertas

### IA y búsqueda web
- `POST /api/openai/extract` — Extraer datos estructurados con IA
- `POST /api/openai/chat` — Chat contextual con IA
- `GET /api/search` — Búsqueda web médica (DuckDuckGo)

---

## Ejemplo de autenticación
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

---

## Ejemplo de request: Crear registro de salud
```http
POST /api/children/<child_id>/records
Content-Type: application/json
Authorization: Bearer <token>

{
  "type": "weight",
  "timestamp": "2024-07-24T10:00:00Z",
  "data": {
    "value": 8.5,
    "unit": "kg",
    "notes": "Pesaje mensual"
  },
  "ai_extracted": true
}
```

---

## Respuestas de error
- 400: Datos inválidos o faltantes
- 401: No autenticado o token inválido
- 403: Sin permisos
- 404: No encontrado
- 429: Rate limit excedido
- 500: Error interno del servidor

---

## Seguridad
- Todas las rutas protegidas por JWT
- Inputs validados y sanitizados
- Logs de auditoría para acciones sensibles

---

> Actualiza y amplía esta documentación conforme evolucione la API y el frontend. 