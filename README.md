# Sentinel AI OS

**Personal AI Second Brain** para organizar tu vida, aprender mas rapido, controlar tareas, analizar informacion y ahorrar tiempo con IA.

Sentinel AI OS no busca ser "otro chatbot". La idea es construir un centro de control personal con memoria, herramientas, automatizaciones, busqueda web, analisis de imagenes, multiples modelos de IA e integraciones autorizadas con tus servicios.

## Estado actual

Este repositorio ya incluye un MVP funcional:

- Chat con IA y memoria persistente.
- Tareas y pendientes.
- Busqueda web.
- Vision AI para analizar imagenes, capturas y errores visuales.
- Vision Memory para guardar analisis de imagenes.
- Selector de proveedor: `auto`, `OpenAI`, `Claude`, `Gemini`, `Ollama` o `local`.
- Selector de idioma: espanol, ingles, portugues y frances.
- Tema claro y tema oscuro.
- Interfaz responsive para Android y navegadores moviles.
- Modulos interactivos para activar ideas del segundo cerebro y convertirlas en tareas.
- Action Center para preparar agendas, mensajes, correos, recordatorios y automatizaciones.
- Deteccion inicial de intenciones desde el chat: si pides agendar o enviar algo, Sentinel crea una accion pendiente.
- Career Dashboard con aplicaciones, estados, recruiters, salario esperado, recordatorios y asistente IA.
- Soporte offline con PWA + Workbox + IndexedDB/Dexie.
- Sync offline/online para Career Tracker.
- WebSockets para refrescar eventos de carrera, actividad y notificaciones en tiempo real.
- Activity Tracker inicial para GPS autorizado, tiempo en apps registrado manualmente y eventos.
- Toggle para apagar/encender notificaciones.
- Migracion PostgreSQL y script JSON -> PostgreSQL.
- World Pulse con noticias por pais/ciudad, globo interactivo, monedas, peso colombiano, oro y ranking PIB.
- Video AI con Gemini 1.5 Pro para subir videos o analizar una URL de YouTube.
- Notebook/Studio con fuentes, notas y outputs tipo audio/video overview, reportes, quiz y data table.
- Agent Lab para preparar automatizaciones como llenar formularios, sugerir mensajes o tareas de navegador.
- Manifest PWA para usarlo desde Chrome como app instalada.
- Dashboard web en React.
- Backend en Node.js + TypeScript.
- Persistencia local en JSON para desarrollo rapido.

Cuando no hay claves de IA, funciona en modo local. Cuando agregas claves en `.env`, usa proveedores reales.

## Ejecutar localmente

### Opcion rapida en Windows

Haz doble clic en:

```text
run-sentinel.bat
```

Ese archivo hace esto automaticamente:

- Verifica que Node.js y npm existan.
- Crea `backend/.env` desde `.env.example` si aun no existe.
- Instala dependencias si falta `node_modules`.
- Inicia backend y frontend.
- Abre `http://localhost:5173` en el navegador.

Para detener la app, vuelve a la ventana del `.bat` y presiona `Ctrl+C`.

### Opcion manual

```bash
cd sentinel-ai
npm install
npm run dev
```

Servicios:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4100`

En Android:

1. Abre `http://TU-IP-LOCAL:5173` desde Chrome si el servidor corre en tu PC.
2. En el menu de Chrome toca **Agregar a pantalla de inicio**.
3. Sentinel se abrira como una app web instalada.

Si lo usas en el mismo equipo, abre `http://localhost:5173`.

Build:

```bash
npm run build
```

## PostgreSQL

El MVP sigue funcionando con JSON local para desarrollo rapido, pero ya incluye migracion PostgreSQL.

1. Crea una base de datos PostgreSQL.
2. Configura `DATABASE_URL` en `backend/.env`.
3. Ejecuta el SQL:

```bash
psql "$DATABASE_URL" -f backend/migrations/001_initial_postgres.sql
```

4. Migra datos JSON existentes a PostgreSQL:

```bash
npm run db:migrate-json --workspace backend
```

## Configuracion

Copia `.env.example` a `backend/.env`:

```bash
cp .env.example backend/.env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example backend/.env
```

Variables principales:

```env
PORT=4100
DATA_FILE=./data/sentinel-store.json

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet-latest

GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1

SERPER_API_KEY=
```

## Modulos del MVP

### Chat Assistant

Permite conversar con Sentinel, guardar conversaciones y usar contexto personal.

Ejemplos:

```text
Recuerda que mi meta es backend y ciberseguridad
Tarea: estudiar Docker manana
Que deberia estudiar hoy?
```

### Memory System

Guarda datos importantes sobre:

- Metas.
- Preferencias.
- Proyectos.
- Aprendizaje.
- Carrera.
- Personas.
- Errores frecuentes.

### Task Manager

Permite crear tareas, marcarlas como completadas y priorizarlas.

### Action Center

Permite pedirle cosas al agente y convertirlas en acciones revisables:

```text
Agenda una reunion con Juan manana a las 3 pm
Envia un mensaje a Carlos diciendo: "Llegare a las 3 pm"
Prepara un correo para el recruiter
Recuérdame estudiar Docker manana
```

Por seguridad, Sentinel no envia mensajes ni correos sin aprobacion. Primero crea una accion pendiente. Cuando se conecten Gmail, Calendar, WhatsApp, Telegram o Microsoft mediante APIs oficiales/OAuth, esas acciones podran ejecutarse desde el mismo panel.

### Career Dashboard

Permite registrar vacantes:

- Empresa.
- Rol.
- Fecha.
- URL.
- Estado: `applied`, `screening`, `interview`, `offer`, `rejected`.
- Notas.
- Recruiter.
- Salario esperado.
- Proxima accion.

Incluye estadisticas de aplicaciones, tasa de respuesta, entrevistas y aplicaciones por semana. Tambien tiene prompts IA como:

```text
Prepare me for my interview with [company]
Write a cover letter for [role]
What questions will they ask at [company]?
```

### Offline/PWA

La app usa Workbox para cachear assets y respuestas API, e IndexedDB con Dexie para guardar datos locales.

Estrategia:

```text
Online  -> backend + IndexedDB
Offline -> IndexedDB
Online de nuevo -> sync al backend
```

Actualmente el sync offline esta implementado para Career Tracker y la cache local cubre tareas e historial de chat.

### Activity Tracker

Incluye una base para:

- GPS/check-ins con permiso del navegador.
- Tiempo en apps registrado manualmente.
- Historial de actividades.
- Configuracion para apagar/encender notificaciones.

Limitacion importante: una PWA en Android no puede leer automaticamente todo el uso de otras apps sin permisos nativos. Para tracking automatico real se necesita una app Android/React Native con permisos de Usage Access, notificaciones y ubicacion.

### Web Search

Permite consultar informacion actual. Si `SERPER_API_KEY` esta configurada, usa Serper. Si no, usa DuckDuckGo Instant Answer como fallback.

### World Pulse

Una seccion para entender que esta pasando en el mundo:

- Noticias importantes por pais y ciudad.
- Globo mundial interactivo con puntos de noticia y animacion tipo planeta.
- Noticias adaptadas al idioma seleccionado: ES, EN, PT o FR.
- Monedas importantes y peso colombiano.
- Oro usando feed publico de Yahoo Finance.
- Bitcoin usando CoinGecko.
- Ranking de paises por PIB y probabilidad estimada de crecimiento.

Las noticias usan feeds RSS publicos y monedas usan una API abierta. Para datos financieros de produccion conviene conectar proveedores oficiales/pagos.

### Vision AI

Permite subir imagenes o capturas y analizarlas con un modelo multimodal.

Casos de uso:

- Capturas de errores de Windows, Linux, Docker, Railway, Vercel o AWS.
- Pantallas de VS Code, IntelliJ, terminales y logs.
- Capturas de Wireshark, Burp Suite, OWASP ZAP, SIEM o Nmap.
- Graficos, diagramas UML y arquitecturas.
- Fotos de hardware, puertos, cables o componentes.
- Imagenes de documentos para extraer informacion.

Si no hay proveedor multimodal configurado, Sentinel guarda la imagen y responde con una guia local. Para analisis real de pixeles/OCR, configura OpenAI, Claude, Gemini u Ollama con un modelo compatible con vision.

### Video AI

Permite subir un video o pegar una URL de YouTube y hacer preguntas. Usa Gemini cuando configuras:

```env
GEMINI_API_KEY=
GEMINI_VIDEO_MODEL=gemini-1.5-pro
```

Si no hay clave, responde en modo local indicando que falta configuracion.

### Notebook/Studio

Inspirado en flujos tipo NotebookLM:

- Agregar fuentes.
- Guardar notas.
- Preparar outputs: Audio Overview, Video Overview, Mind Map, Reports, Flashcards, Quiz, Infographic y Data Table.

### Agent Lab

Permite preparar automatizaciones:

- Llenar formularios.
- Sugerir mensajes para enviar a personas.
- Preparar tareas de navegador.

Por seguridad, las acciones se crean como pendientes y deben aprobarse antes de ejecutarse.


### Experiencia interactiva

La interfaz incluye:

- Logo con escudo, ojo y target.
- Hover/tap states en tarjetas, botones, modulos, busquedas y mensajes.
- Botones bajo respuestas del chat para copiar, reproducir, valorar y reintentar.
- Animacion de pensamiento con el logo de Sentinel: escudo, ojo y target girando.
- Selector de idioma custom con animacion, sin dropdown nativo.
- Sidebar configurable: modo compacto y opcion para ocultar secciones que no uses.
- Navegacion por secciones para pantallas pequenas.
- Tema claro/oscuro persistente.
- Idiomas `ES`, `EN`, `PT` y `FR`.
- Modulos clicables para activar areas como carrera, aprendizaje, ciberseguridad, documentos, reuniones, voz, mobile, finanzas, salud, Gmail, GitHub y objetivos.
- Boton para convertir cualquier modulo en una tarea.

## Arquitectura actual

```text
React Frontend
      |
      v
Node.js Sentinel Backend
      |
      +-- Chat AI
      +-- Memory System
      +-- Task Manager
      +-- Web Search
      +-- Vision AI
      +-- Provider Router
             |
             +-- OpenAI
             +-- Claude
             +-- Gemini
             +-- Ollama
             +-- Local fallback
```

## Vision del producto

```text
Sentinel AI OS
|
+-- Chat Assistant
+-- Vision AI
+-- Voice Assistant
+-- Meeting Assistant
+-- Subtitle Assistant
+-- Screen Analyzer
+-- Career Dashboard
+-- Time Tracker
+-- Goal Tracker
+-- Memory System
+-- Project Manager
+-- Cybersecurity Assistant
+-- Gmail / Calendar / GitHub
+-- Microsoft 365 / Excel / Word / PowerPoint
+-- WhatsApp / Telegram
+-- Mobile App
+-- Plugin System
+-- Life Timeline
```

## Roadmap recomendado

### Fase 1: Segundo cerebro base

- Chat con memoria.
- Tareas.
- Dashboard.
- Busqueda web.
- Vision AI.
- Historial de imagenes analizadas.

### Fase 2: Productividad y carrera

- Objetivos y progreso.
- Seguimiento de aprendizaje.
- Vacantes aplicadas.
- Entrevistas.
- CV y LinkedIn.
- Compatibilidad entre vacantes y perfil.
- GitHub integration.

### Fase 3: Integraciones personales

- Gmail.
- Google Calendar.
- Microsoft 365.
- Excel.
- Word.
- PowerPoint.
- Notificaciones inteligentes.

### Fase 4: Ciberseguridad

- Noticias de amenazas.
- CVEs.
- MITRE ATT&CK.
- OWASP.
- NIST.
- IOC.
- YARA.
- Integracion con SecureWatch, ThreatLens y VulnScope.

### Fase 5: Voz, reuniones y subtitulos

- Dictado por voz.
- Respuestas habladas.
- Resumen de reuniones.
- Extraccion de tareas.
- Subtitulos y sugerencias en entrevistas, siempre con permiso.

### Fase 6: App movil

- React Native.
- Camara.
- Notificaciones.
- Acciones rapidas.
- Compartir contenido hacia Sentinel.
- Aprobacion de automatizaciones.

### Fase 7: Automatizaciones

Ejemplo:

```text
Si un deploy falla
  -> crear issue
  -> guardar log
  -> avisar por correo
  -> sugerir solucion
```

## Seguridad y privacidad

Sentinel AI OS debe construirse con seguridad desde el inicio:

- Usar APIs oficiales.
- Pedir permisos explicitos.
- No controlar apps o dispositivos sin autorizacion.
- Cifrar secretos.
- Registrar acciones importantes.
- Pedir confirmacion antes de enviar correos, borrar archivos, publicar contenido o ejecutar automatizaciones sensibles.
- Separar datos personales de datos de prueba.

## Siguiente mejora tecnica

Para pasar de MVP local a producto serio:

- PostgreSQL + Prisma.
- Redis para colas y jobs.
- OAuth para Gmail, Calendar, GitHub y Microsoft.
- FastAPI para RAG, OCR y embeddings.
- S3 o Cloudflare R2 para imagenes/documentos.
- WebSockets para tiempo real.
- Autenticacion con JWT/session segura.

## Nombre

```text
Sentinel AI OS
Personal AI Second Brain
```

La meta es que te ayude a llevar control de todo: aprendizaje, carrera, proyectos, ciberseguridad, tareas, documentos, reuniones y decisiones. Un asistente que recuerde, analice, priorice y te ayude a ahorrar tiempo.
