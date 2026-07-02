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
- Dashboard web en React.
- Backend en Node.js + TypeScript.
- Persistencia local en JSON para desarrollo rapido.

Cuando no hay claves de IA, funciona en modo local. Cuando agregas claves en `.env`, usa proveedores reales.

## Ejecutar localmente

```bash
cd sentinel-ai
npm install
npm run dev
```

Servicios:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4100`

Build:

```bash
npm run build
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

### Web Search

Permite consultar informacion actual. Si `SERPER_API_KEY` esta configurada, usa Serper. Si no, usa DuckDuckGo Instant Answer como fallback.

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
