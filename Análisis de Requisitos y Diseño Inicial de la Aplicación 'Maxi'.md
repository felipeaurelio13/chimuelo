
# Análisis de Requisitos y Diseño Inicial de la Aplicación 'Maxi'

## 1. Visión General
La aplicación 'Maxi' busca ser una herramienta completa y minimalista para el seguimiento de la salud y el crecimiento infantil. Se enfocará en ser mobile-first y una PWA (Progressive Web App) offline-first, garantizando una experiencia de usuario fluida y accesible en todo momento.

## 2. Funcionalidades Clave
- **Captura de Datos**: Soporte para diversos formatos de entrada (fotos, PDFs, audio, texto, video) a través de cámara, drag-and-drop, micrófono y grabación en vivo.
- **Extracción de Datos con IA**: Utilización de OpenAI GPT-4.1/GPT-4o para procesar los inputs y extraer datos estructurados en formato JSON (peso, talla, síntomas, hitos, etc.) mediante el uso de Structured Outputs y JSON Schema.
- **Búsqueda Web**: Integración con un motor de búsqueda (DuckDuckGo a través de Cloudflare Worker) para obtener citas de fuentes confiables, manteniendo el contexto de la IA.
- **Timeline Cronológico**: Una vista cronológica filtrable de todos los eventos de salud y crecimiento, con un modo 


"bebé dormido" con UI tenue.
- **Chat de Dudas con IA**: Un chat impulsado por GPT-4o que utiliza todo el contexto acumulado (inputs y resultados de búsqueda web) para responder preguntas.
- **Insights y Alertas**: Generación de gráficas percentiles y alertas locales (ej. peso estancado, vacunas pendientes).
- **Exportación y Backup**: Funcionalidad para exportar el timeline completo en PDF/CSV y un backup cifrado opcional en Gist privado.

## 3. Arquitectura Técnica
La aplicación se basará en una arquitectura moderna y distribuida:
- **Frontend**: Una PWA desarrollada con React, alojada en GitHub Pages para despliegue estático.
- **Backend/API Proxy**: Un Cloudflare Worker ligero que actuará como proxy para las APIs de OpenAI y DuckDuckGo, ocultando la `OPENAI_API_KEY` y gestionando el rate-limiting y logging. Expondrá solo las rutas `/openai/*` y `/search/*`.
- **Almacenamiento Local**: IndexedDB con cifrado AES para almacenar datos offline. Se ofrecerá una opción de sincronización a un Gist privado cifrado, con el token guardado en el almacenamiento local cifrado del navegador.
- **Offline-first**: Implementación de un Service Worker para cachear assets e inputs, permitiendo el uso completo de la aplicación sin conexión a internet.

## 4. Seguridad y Privacidad
Se priorizará la seguridad y privacidad de los datos:
- La `OPENAI_API_KEY` nunca se expondrá en el bundle del cliente.
- El Cloudflare Worker implementará un rate-limit de 100 RPM para la API de OpenAI.
- Los datos en IndexedDB se cifrarán simétricamente usando `crypto.subtle`.
- El backup remoto en Gist también estará cifrado de la misma forma, y el token de acceso se guardará en un almacenamiento local cifrado.

## 5. Integración con OpenAI
- **Structured Outputs**: Se definirán JSON Schemas específicos para cada tipo de output, utilizando la bandera `strict: true` para la validación automática. Se validará en cliente con AJV y se implementarán reintentos en caso de fallos de schema.
- **Parámetros de Modelo**: Se usarán diferentes modelos y parámetros según el caso de uso: `gpt-4.1` con `temperature=0.2` y `tokens<=1024` para extracción estricta, y `gpt-4o` con `temperature=0.7` y `tokens<=2048` para el chat de dudas.

## 6. Tests
Se implementará una estrategia de testing robusta sin mock data:
- **Unit Tests**: Con Jest y React Testing Library, mockeando `fetch` al Worker y usando respuestas grabadas de sandbox de OpenAI.
- **Integration Tests**: Con Playwright, simulando flujos reales de usuario (subir foto → JSON → timeline → pregunta en chat).
- **E2E Prod Tests**: Ejecutados nightly con GitHub Actions, realizando consultas reales al Worker con cuota controlada y snapshots de salida.

## 7. CI/CD
Se establecerá un pipeline de CI/CD automatizado:
- **Lint/Test**: Ejecutados en GitHub Actions.
- **Build PWA**: Push a GitHub Pages.
- **Despliegue Cloudflare Worker**: Via `wrangler deploy` desde el mismo pipeline.
- **Release Management**: Tags SemVer y Changelog automático.

## 8. Convenciones
- **Commits**: Uso de convenciones como `feat`, `fix`, `chore`, etc. (ej. `feat(ui): add dark-sleep mode`).
- **Branches**: `main`, `feature/*`, `hotfix/*`.
- **Docs**: Documentación en Markdown, actualizada en cada Pull Request.



## 9. Mejoras y Aclaraciones Propuestas

### 9.1. Manejo de Errores y Reintentos
Se propone una estrategia robusta de manejo de errores que incluya:
- **Errores de Red**: Implementación de reintentos con backoff exponencial para fallos de conexión al Cloudflare Worker o a las APIs externas.
- **Errores de Procesamiento de IA**: Además de los reintentos por fallos de schema, considerar reintentos con prompts alternativos o más específicos si la IA no devuelve el JSON esperado.
- **Notificaciones al Usuario**: Informar al usuario de manera clara y concisa sobre cualquier error que ocurra, ofreciendo opciones para reintentar o reportar el problema.

### 9.2. Gestión de Sesiones y Autenticación
Dado que la aplicación maneja datos sensibles, es crucial definir un mecanismo de autenticación. Se propone:
- **Autenticación Basada en Token**: Utilizar tokens (ej. JWT) para autenticar las solicitudes al Cloudflare Worker. Esto permitiría una sesión persistente y segura.
- **Registro/Inicio de Sesión**: Implementar un flujo de registro y inicio de sesión sencillo, posiblemente utilizando proveedores de identidad externos (ej. Google, Apple) para mayor comodidad y seguridad, o un sistema de usuario/contraseña gestionado por el Cloudflare Worker (requeriría una base de datos de usuarios).
- **Recuperación de Contraseña**: Un mecanismo seguro para la recuperación de contraseñas o tokens de acceso.

### 9.3. Estructura de Datos Detallada
Aunque se menciona JSON Schema, sería beneficioso definir con mayor detalle la estructura de datos para los diferentes tipos de registros de salud (vacunas, visitas médicas, medicaciones, alergias, etc.) más allá de peso, talla y síntomas. Esto aseguraría la robustez de la ficha de salud dinámica.

### 9.4. Consideraciones de Rendimiento
- **Optimización de Consultas a IndexedDB**: Asegurar que las consultas a IndexedDB sean eficientes, especialmente para el timeline que podría contener muchos registros.
- **Paginación/Carga Diferida**: Implementar paginación o carga diferida (lazy loading) en el timeline para mejorar el rendimiento en dispositivos móviles con grandes volúmenes de datos.

### 9.5. Diseño de Interfaz de Usuario (UI) y Experiencia de Usuario (UX)
Se propone un diseño que enfatice la simplicidad y la facilidad de uso, siguiendo la visión minimalista y mobile-first:
- **Navegación Intuitiva**: Una barra de navegación inferior para acceso rápido a las secciones principales (Captura, Timeline, Chat, Insights).
- **Modo 


"Bebé Dormido"**: Una interfaz de usuario con colores tenues y menos elementos interactivos para no molestar al bebé.
- **Feedback Visual**: Indicadores claros de carga, éxito y error para las operaciones.
- **Personalización**: Opciones básicas de personalización (ej. tema claro/oscuro, unidades de medida).

### 9.6. Timeline y Fechas Futuras
La idea de un timeline con fechas futuras es excelente. Se propone:
- **Eventos Programados**: Permitir al usuario añadir eventos futuros como citas médicas, vacunas, o hitos de desarrollo esperados.
- **Recordatorios**: Integrar notificaciones locales (a través del Service Worker) para recordar al usuario sobre estos eventos próximos.
- **Visualización Clara**: Distinguir visualmente los eventos pasados, presentes y futuros en el timeline.

### 9.7. Ficha Robusta de Salud Dinámica
Para que la ficha sea realmente robusta y dinámica, se propone:
- **Campos Configurables**: Permitir al usuario añadir o personalizar campos en la ficha de salud según sus necesidades.
- **Historial Detallado**: Cada entrada en la ficha debe tener un historial de cambios, permitiendo ver la evolución de un parámetro a lo largo del tiempo.
- **Integración con Insights**: La ficha debe alimentar directamente las gráficas y alertas de la sección de Insights.

### 9.8. Consideraciones Legales y de Privacidad
- **Consentimiento Explícito**: Asegurarse de obtener el consentimiento explícito del usuario para el almacenamiento y procesamiento de datos de salud, especialmente si se utiliza un backup en Gist.
- **Cumplimiento Normativo**: Investigar y asegurar el cumplimiento con las regulaciones de privacidad de datos relevantes (ej. GDPR, HIPAA si aplica en el contexto del usuario).

Este análisis inicial servirá como base para el diseño detallado de la arquitectura y la implementación de la aplicación.



## 10. Estructura General de la Aplicación y Módulos Principales

La aplicación se estructurará en los siguientes módulos principales, reflejando las funcionalidades clave y la arquitectura propuesta:

### 10.1. Módulo de Autenticación y Gestión de Usuarios
- **Funcionalidad**: Registro, inicio de sesión, recuperación de contraseña, gestión de perfil de usuario.
- **Componentes Clave**: Interfaz de usuario para autenticación, lógica de autenticación (posiblemente con JWT), almacenamiento seguro de credenciales (localmente cifrado).

### 10.2. Módulo de Captura de Datos
- **Funcionalidad**: Interfaz para subir o capturar diferentes tipos de inputs (texto, imagen, audio, video, PDF).
- **Componentes Clave**: Controles de cámara/micrófono, drag-and-drop, formularios de texto, previsualización de archivos, integración con el módulo de IA para procesamiento inicial.

### 10.3. Módulo de Procesamiento de IA (Integración con Cloudflare Worker)
- **Funcionalidad**: Envío de inputs al Cloudflare Worker para extracción de datos estructurados y gestión del chat de dudas.
- **Componentes Clave**: Lógica de comunicación con el Worker, manejo de JSON Schemas, validación de respuestas de IA, reintentos.

### 10.4. Módulo de Almacenamiento y Sincronización de Datos
- **Funcionalidad**: Gestión de datos en IndexedDB (cifrado), sincronización opcional con Gist privado.
- **Componentes Clave**: Capa de abstracción para IndexedDB, lógica de cifrado/descifrado, gestión de tokens de Gist, lógica de sincronización.

### 10.5. Módulo de Timeline
- **Funcionalidad**: Visualización cronológica de eventos, filtrado, modo 


"bebé dormido".
- **Componentes Clave**: Componentes de UI para el timeline, lógica de filtrado y ordenamiento, integración con los datos almacenados.

### 10.6. Módulo de Ficha de Salud Dinámica
- **Funcionalidad**: Visualización y edición de la ficha de salud del niño, con campos dinámicos y seguimiento del historial.
- **Componentes Clave**: Componentes de UI para la ficha, lógica para añadir/editar campos, visualización de historial de cambios.

### 10.7. Módulo de Insights y Alertas
- **Funcionalidad**: Generación de gráficas (percentiles), análisis de datos, alertas personalizables.
- **Componentes Clave**: Lógica de cálculo de percentiles, componentes de visualización de datos (gráficas), sistema de notificación local.

### 10.8. Módulo de Búsqueda Web
- **Funcionalidad**: Interfaz para realizar búsquedas web contextuales a través del Cloudflare Worker.
- **Componentes Clave**: Campo de búsqueda, visualización de resultados con citas, integración con el chat de dudas.

### 10.9. Módulo de Exportación y Backup
- **Funcionalidad**: Generación de PDF/CSV del timeline, gestión de backup a Gist.
- **Componentes Clave**: Lógica de generación de documentos, interfaz para configuración de backup.

### 10.10. Módulo de Configuración y Personalización
- **Funcionalidad**: Ajustes de la aplicación (unidades de medida, tema, notificaciones).
- **Componentes Clave**: Interfaz de usuario para configuración, almacenamiento de preferencias de usuario.

Esta estructura modular permitirá un desarrollo organizado y facilitará la escalabilidad y el mantenimiento de la aplicación.



## 11. Esbozo de Diseño UI/UX Inicial

El diseño de la interfaz de usuario (UI) y la experiencia de usuario (UX) de la aplicación 'Maxi' se centrará en la simplicidad, la intuición y la accesibilidad, adhiriéndose a los principios de 'minimalista, mobile-first y PWA offline-first'.

### 11.1. Principios de Diseño
- **Minimalismo**: Interfaz limpia, con solo los elementos esenciales visibles para evitar la sobrecarga de información.
- **Mobile-First**: Prioridad al diseño para pantallas pequeñas, asegurando que la experiencia sea óptima en dispositivos móviles antes de escalar a pantallas más grandes.
- **Accesibilidad**: Consideración de contrastes de color, tamaños de fuente legibles y navegación por teclado para usuarios con diversas necesidades.
- **Consistencia**: Uso de un sistema de diseño unificado para mantener la coherencia visual y de interacción en toda la aplicación.
- **Feedback Inmediato**: Respuestas visuales y hápticas a las interacciones del usuario para confirmar acciones y guiar la navegación.

### 11.2. Estructura de Navegación (Mobile)
Se propone una barra de navegación inferior persistente para las secciones principales, permitiendo un acceso rápido y fácil:
- **Inicio/Dashboard**: Un resumen personalizable de la salud del niño, próximos eventos y alertas importantes.
- **Captura**: Acceso directo a las opciones de captura de datos (foto, audio, texto, etc.).
- **Timeline**: La vista cronológica de todos los registros de salud y crecimiento.
- **Chat IA**: Acceso al chat para consultas con la IA.
- **Perfil/Configuración**: Gestión del perfil del niño, ajustes de la aplicación y opciones de exportación/backup.

### 11.3. Elementos Clave de la Interfaz
- **Botones de Acción Flotantes (FAB)**: Un FAB central en la pantalla de inicio o captura para añadir rápidamente nuevos registros.
- **Tarjetas de Información**: Uso de tarjetas para presentar la información de manera concisa y fácil de digerir en el timeline y el dashboard.
- **Iconografía Clara**: Iconos intuitivos para representar las diferentes funcionalidades y tipos de datos.
- **Tipografía Legible**: Fuentes claras y de tamaño adecuado para garantizar la legibilidad en todas las pantallas.
- **Paleta de Colores Suave**: Colores que transmitan calma y profesionalismo, con énfasis en el modo 


"bebé dormido" con una paleta de colores tenues.

### 11.4. Flujo de Usuario (Ejemplo: Añadir un nuevo registro de peso)
1. **Inicio**: El usuario toca el FAB de "Añadir Registro".
2. **Selección de Tipo**: Se muestra un menú para seleccionar el tipo de registro (ej. "Peso").
3. **Entrada de Datos**: Se presenta un formulario simple para introducir el peso, la fecha y la hora (pre-rellenados con la fecha y hora actuales).
4. **Confirmación**: El usuario confirma la entrada.
5. **Procesamiento en Segundo Plano**: La aplicación guarda el registro en IndexedDB y lo envía al Cloudflare Worker para su procesamiento por la IA.
6. **Feedback Visual**: Se muestra una notificación de éxito y el nuevo registro aparece en el timeline.

Este esbozo inicial servirá como guía para la creación de wireframes y prototipos más detallados en la fase de desarrollo del frontend.



## 12. Requisitos Funcionales y No Funcionales

### 12.1. Requisitos Funcionales (RF)

**RF1: Gestión de Datos de Salud**
- RF1.1: La aplicación debe permitir la captura de datos de salud en diversos formatos (texto, imagen, audio, video, PDF).
- RF1.2: La aplicación debe procesar los inputs mediante IA (OpenAI GPT-4.1/GPT-4o) para extraer datos estructurados (peso, talla, síntomas, hitos, etc.).
- RF1.3: La aplicación debe almacenar los datos de salud de forma local en IndexedDB, cifrados con AES.
- RF1.4: La aplicación debe permitir la sincronización opcional de los datos con un Gist privado cifrado.
- RF1.5: La aplicación debe permitir la edición y eliminación de registros de salud existentes.

**RF2: Timeline Cronológico**
- RF2.1: La aplicación debe mostrar un timeline cronológico de todos los registros de salud y eventos.
- RF2.2: El timeline debe ser filtrable por tipo de evento o categoría de datos.
- RF2.3: La aplicación debe incluir un "modo bebé dormido" con una interfaz de usuario tenue.
- RF2.4: La aplicación debe permitir la adición de eventos futuros (citas, vacunas) al timeline.
- RF2.5: La aplicación debe generar recordatorios locales para los eventos futuros.

**RF3: Chat de Dudas con IA**
- RF3.1: La aplicación debe proporcionar un chat interactivo impulsado por GPT-4o.
- RF3.2: El chat debe utilizar el contexto acumulado (inputs del usuario y resultados de búsqueda web) para responder preguntas.

**RF4: Insights y Alertas**
- RF4.1: La aplicación debe generar gráficas percentiles basadas en los datos de crecimiento (peso, talla).
- RF4.2: La aplicación debe generar alertas locales basadas en umbrales predefinidos o personalizados (ej. peso estancado, vacunas pendientes).

**RF5: Búsqueda Web Contextual**
- RF5.1: La aplicación debe permitir realizar búsquedas web a través de un Cloudflare Worker (proxy a DuckDuckGo).
- RF5.2: Los resultados de la búsqueda deben incluir citas de fuentes confiables.

**RF6: Exportación y Backup**
- RF6.1: La aplicación debe permitir la exportación del timeline completo en formato PDF o CSV.
- RF6.2: La aplicación debe permitir la realización de backups cifrados a un Gist privado.

**RF7: Gestión de Usuarios y Autenticación**
- RF7.1: La aplicación debe permitir el registro y el inicio de sesión de usuarios.
- RF7.2: La aplicación debe autenticar las solicitudes al Cloudflare Worker mediante tokens seguros.
- RF7.3: La aplicación debe proporcionar un mecanismo para la recuperación de contraseñas/tokens.

**RF8: Ficha de Salud Dinámica**
- RF8.1: La aplicación debe mostrar una ficha de salud robusta y dinámica para el niño.
- RF8.2: La ficha debe permitir la personalización y adición de campos por parte del usuario.
- RF8.3: Cada entrada en la ficha debe mantener un historial de cambios.

### 12.2. Requisitos No Funcionales (RNF)

**RNF1: Rendimiento**
- RNF1.1: La aplicación debe ser rápida y responsiva, con tiempos de carga mínimos.
- RNF1.2: Las operaciones de procesamiento de IA y sincronización deben ejecutarse en segundo plano para no bloquear la UI.
- RNF1.3: La aplicación debe manejar grandes volúmenes de datos en el timeline de manera eficiente (ej. mediante paginación o carga diferida).

**RNF2: Seguridad**
- RNF2.1: La `OPENAI_API_KEY` nunca debe ser expuesta en el cliente.
- RNF2.2: Todos los datos sensibles almacenados localmente (IndexedDB) y remotamente (Gist) deben estar cifrados.
- RNF2.3: El Cloudflare Worker debe implementar rate-limiting para proteger la API de OpenAI.
- RNF2.4: La autenticación debe ser segura, utilizando tokens y mecanismos de recuperación robustos.

**RNF3: Fiabilidad y Disponibilidad**
- RNF3.1: La aplicación debe funcionar 100% offline (PWA offline-first).
- RNF3.2: La aplicación debe implementar reintentos con backoff exponencial para fallos de red o de API.
- RNF3.3: La aplicación debe ser resistente a fallos de schema de la IA, con reintentos y validación en cliente.

**RNF4: Usabilidad y Experiencia de Usuario (UX)**
- RNF4.1: La interfaz de usuario debe ser minimalista, intuitiva y fácil de usar.
- RNF4.2: La aplicación debe ser mobile-first, optimizada para pantallas pequeñas.
- RNF4.3: La aplicación debe proporcionar feedback claro al usuario sobre el estado de las operaciones (carga, éxito, error).
- RNF4.4: La aplicación debe ser accesible para usuarios con diversas necesidades.

**RNF5: Mantenibilidad y Escalabilidad**
- RNF5.1: El código debe ser modular y bien documentado.
- RNF5.2: La arquitectura debe permitir la fácil adición de nuevas funcionalidades.
- RNF5.3: La aplicación debe seguir convenciones de desarrollo (commits, branches, docs).

**RNF6: Compatibilidad**
- RNF6.1: La PWA debe ser compatible con los navegadores modernos (Chrome, Firefox, Safari, Edge).

**RNF7: Privacidad y Cumplimiento Legal**
- RNF7.1: La aplicación debe obtener el consentimiento explícito del usuario para el procesamiento de datos de salud.
- RNF7.2: La aplicación debe cumplir con las regulaciones de privacidad de datos relevantes (ej. GDPR, HIPAA si aplica).

