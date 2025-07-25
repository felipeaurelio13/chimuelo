# Maxi

Maxi es una aplicación para gestionar la salud y el bienestar de tu hijo, permitiendo llevar un registro detallado de eventos médicos, tratamientos, y evolución a lo largo del tiempo mediante un timeline interactivo.

## Características principales
- Registro de eventos médicos y de salud
- Timeline visual para seguimiento
- Gestión de usuarios y autenticación
- Sincronización de datos y cifrado
- Interfaz web moderna (React + Vite)
- Backend en Python

## Estructura del proyecto
- `frontend/`: Aplicación web (React, TypeScript)
- `worker/`: Servicios y utilidades adicionales
- Archivos Python: Lógica de backend y modelos de datos

## Requisitos
- Node.js >= 18.x (para el frontend)
- Python >= 3.10 (para el backend)
- pip (para instalar dependencias Python)
- Git

## Instalación y ejecución

### Backend
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Para iniciar el backend:
sh start_platform.sh
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Contribución
1. Haz un fork del repositorio
2. Crea una rama para tu feature: `git checkout -b mi-feature`
3. Haz commit de tus cambios: `git commit -am 'Agrega nueva feature'`
4. Haz push a tu rama: `git push origin mi-feature`
5. Abre un Pull Request

## Licencia
MIT

---

> Proyecto desarrollado por felipeaurelio13 y colaboradores. ¡Gracias por contribuir! 