# Roadmap Maxi — Salud & Crecimiento Infantil

## 1. Visión y Objetivos
- [x] Definir visión: PWA minimalista, mobile-first, offline-first para salud infantil.
- [x] Documentar funcionalidades clave y arquitectura general.

---

## 2. Entorno y Base Técnica
- [x] Crear entorno virtual y requirements.txt para backend Flask.
- [x] Configurar variables de entorno (.env) seguras.
- [x] Estructura modular de backend (Flask, Blueprints, SQLAlchemy, JWT, CORS, dotenv).
- [x] Base de datos local (SQLite) y modelos de datos.
- [x] Documentar estructura de datos y arquitectura (MD, diagramas).

---

## 3. Backend/API (Flask)
- [x] API de autenticación y gestión de usuarios (registro, login, JWT, perfil).
- [x] API de gestión de niños y registros de salud (CRUD).
- [x] API de procesamiento IA (proxy a OpenAI, extracción de datos estructurados).
- [x] API de chat con IA (GPT-4o, contexto, búsqueda web).
- [x] API de búsqueda web (proxy a DuckDuckGo).
- [x] Middleware de CORS, manejo de errores y seguridad.
- [x] Sistema de auditoría y logs de uso.
- [ ] Documentar todas las rutas y endpoints (OpenAPI/Swagger o MD).

---

## 4. Seguridad y Privacidad
- [x] Nunca exponer OPENAI_API_KEY en el cliente.
- [x] Validación y sanitización de inputs.
- [x] JWT para autenticación.
- [x] Cifrado de datos sensibles.
- [ ] Consentimiento explícito y cumplimiento normativo (GDPR/HIPAA) en la UI.

---

## 5. Testing y Calidad
- [x] Tests unitarios para autenticación (`test_auth.py`).
- [x] Tests unitarios para gestión de salud (`test_health.py`).
- [ ] Tests de integración (simular flujos completos).
- [ ] Tests E2E (automatizados, idealmente con Playwright).
- [ ] Cobertura de tests >80%.
- [ ] CI/CD: Automatizar lint, test y despliegue (GitHub Actions recomendado).

---

## 6. Frontend (PWA React)
- [ ] Crear estructura base de PWA React (Create React App, Vite o similar).
- [ ] Implementar Service Worker para offline.
- [ ] Implementar IndexedDB cifrado para almacenamiento local.
- [ ] Pantallas principales: Login, Registro, Dashboard, Captura, Timeline, Chat, Perfil.
- [ ] Integrar API backend y Worker (fetch seguro, JWT).
- [ ] UI/UX minimalista, mobile-first, accesible.
- [ ] Modo “bebé dormido” (UI tenue).
- [ ] Exportación y backup cifrado (Gist privado).
- [ ] Tests unitarios y de integración (Jest, React Testing Library).

---

## 7. Cloudflare Worker (API Proxy)
- [ ] Crear Worker para proxy seguro a OpenAI y DuckDuckGo.
- [ ] Implementar rate-limiting y logging.
- [ ] Ocultar OPENAI_API_KEY y exponer solo `/openai/*` y `/search/*`.
- [ ] Desplegar con wrangler y automatizar en CI/CD.

---

## 8. Sincronización y Backup
- [ ] Sincronización opcional de datos cifrados a Gist privado.
- [ ] Gestión segura de token de Gist en almacenamiento local cifrado.

---

## 9. Insights, Alertas y Exportación
- [ ] Gráficas percentiles y alertas locales (peso, vacunas, etc.).
- [ ] Exportar timeline a PDF/CSV.
- [ ] Notificaciones locales (Service Worker).

---

## 10. Documentación y Buenas Prácticas
- [x] Documentación técnica y funcional en Markdown.
- [ ] Documentar API (Swagger o Postman).
- [ ] Wireframes y prototipos UI/UX.
- [ ] Changelog y convenciones de commits (feat, fix, chore...).
- [ ] Actualizar roadmap y checklist periódicamente.

---

## 11. Lanzamiento y Feedback
- [ ] Despliegue inicial (backend, frontend, worker).
- [ ] Pruebas con usuarios reales.
- [ ] Recopilar feedback y ajustar roadmap.

---

# Leyenda
- [x] Completado
- [ ] Pendiente

---

## Consejos para tu roadmap
- **Manténlo simple y visual**: No sobrecargues de detalles, solo los hitos y entregables clave.
- **Actualízalo regularmente**: Ajusta prioridades y marca avances.
- **Comparte con tu equipo/stakeholders**: Es una herramienta de comunicación, no solo de gestión.
- **Sé flexible**: Adapta el roadmap según los retos y oportunidades que surjan ([fuente](https://clickup.com/blog/project-roadmap/)).

---

¿Quieres que te ayude a crear la estructura base del frontend, el Worker, o a documentar la API? ¿O prefieres que te ayude a automatizar el CI/CD? 