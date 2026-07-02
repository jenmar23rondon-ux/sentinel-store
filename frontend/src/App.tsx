import { type CSSProperties, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Bot,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clipboard,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  FileText,
  Github,
  Globe2,
  GraduationCap,
  HeartPulse,
  ImagePlus,
  KeyRound,
  Languages,
  Loader2,
  Mail,
  MapPin,
  Menu,
  Mic,
  Maximize2,
  Minimize2,
  Moon,
  Newspaper,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sun,
  Target,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Video,
  Wand2,
  WalletCards,
  WifiOff,
  X
} from "lucide-react";
import { registerSW } from "virtual:pwa-register";
import { api } from "./services/api";
import { cacheBootstrap, loadOfflineSnapshot, syncWhenOnline } from "./services/sync";
import { offlineDb, queueSync } from "./services/offlineDb";
import type { ActionItem, ActionStatus, ActionType, ActivityEvent, ChartKind, CustomChart, JobApplication, JobStatus, MemoryItem, Message, NotificationSettings, ProviderName, SearchResult, TaskItem, VisionItem } from "./types";
import type { WorldPulse } from "./types";

type Language = "es" | "en" | "pt" | "fr";
type Theme = "light" | "dark";
type ViewKey = "chat" | "world" | "analytics" | "video" | "notebook" | "actions" | "career" | "activity" | "tasks" | "memory" | "vision" | "search" | "modules";

const defaultPanelOrder: ViewKey[] = ["world", "notebook", "analytics", "video", "actions", "career", "activity", "memory", "tasks", "search", "vision", "modules"];

const translations = {
  es: {
    subtitle: "Segundo cerebro personal",
    command: "Centro de mando personal",
    commandCopy: "Chat, memoria, tareas, Vision AI y modulos para controlar tu vida digital.",
    language: "Idioma",
    theme: "Tema",
    light: "Claro",
    dark: "Oscuro",
    provider: "Modelo",
    installApp: "Instalar app",
    updateReady: "Hay una nueva version disponible.",
    updateNow: "Actualizar",
    installHint: "En iOS: Compartir > Agregar a pantalla de inicio.",
    memories: "Memorias",
    openTasks: "Abiertas",
    vision: "Vision",
    integrations: "Integraciones",
    ready: "lista",
    next: "siguiente fase",
    fallback: "fallback",
    pending: "pendiente",
    modules: "Modulos",
    world: "Mundo",
    worldPulse: "Mundo actual",
    analytics: "Estadísticas",
    downloadPdf: "Descargar PDF",
    minimize: "Minimizar",
    expand: "Agrandar",
    moveUp: "Subir",
    moveDown: "Bajar",
    charts: "Gráficos",
    smartCharts: "Graficas inteligentes",
    chartPrompt: "Pidele una grafica a Sentinel",
    createChart: "Crear grafica",
    chartExample: "Ej: crea una grafica de horas de estudio: lunes 2, martes 3, miercoles 1.5",
    noCharts: "Aun no hay graficas personalizadas. Pidele a la IA que cree una con tus datos.",
    probability: "Probabilidad",
    videoAi: "Video AI",
    notebook: "Notebook",
    automationLab: "Agent Lab",
    currencies: "Monedas",
    richestCountries: "Ranking PIB",
    growthChance: "Crecimiento",
    uploadVideo: "Subir video",
    youtubeUrl: "URL de YouTube",
    videoQuestion: "Pregunta sobre el video",
    analyzeVideo: "Analizar video",
    sources: "Fuentes",
    addSource: "Agregar fuente",
    addNote: "Agregar nota",
    studio: "Studio",
    formAgent: "Automatizar formularios",
    actions: "Acciones",
    career: "Carrera",
    activity: "Actividad",
    offline: "Estas offline - los cambios se sincronizaran cuando vuelvas a conectarte.",
    notifications: "Notificaciones",
    gps: "GPS y tiempo",
    appUsage: "Apps",
    disableNotifications: "Apagar notificaciones",
    enableNotifications: "Encender notificaciones",
    addApplication: "Agregar vacante",
    company: "Empresa",
    role: "Rol",
    url: "URL",
    notes: "Notas",
    recruiter: "Recruiter",
    salary: "Salario esperado",
    nextAction: "Proxima accion",
    responseRate: "Respuesta",
    interviews: "Entrevistas",
    totalApplications: "Aplicaciones",
    applicationsWeek: "Esta semana",
    careerAi: "IA de carrera",
    actionCenter: "Action Center",
    actionCopy: "Prepara agendas, mensajes, correos y automatizaciones con aprobacion antes de ejecutar.",
    approve: "Aprobar",
    complete: "Completar",
    cancel: "Cancelar",
    manualAction: "Nueva accion",
    target: "Persona/destino",
    draft: "Mensaje o detalle",
    schedule: "Horario",
    addAction: "Crear accion",
    noActions: "Aun no hay acciones. Pidele al agente: agenda una reunion, prepara un mensaje o crea un recordatorio.",
    actionPending: "Pendiente",
    actionApproved: "Aprobada",
    actionDone: "Completada",
    actionCancelled: "Cancelada",
    chat: "Chat",
    tasks: "Tareas",
    memory: "Memoria",
    internet: "Internet",
    visionAI: "Vision AI",
    assistantReady: "Tu asistente esta listo",
    assistantHint: "Prueba: \"Recuerda que mi meta es backend y ciberseguridad\" o \"Tarea: estudiar Docker manana\".",
    you: "Tu",
    sentinel: "Sentinel",
    chatPlaceholder: "Escribe una instruccion, idea o pendiente...",
    send: "Enviar",
    importantData: "Dato importante",
    saveMemory: "Guardar memoria",
    newTask: "Nueva tarea",
    createTask: "Crear tarea",
    low: "Baja",
    medium: "Media",
    high: "Alta",
    searchWeb: "Buscar en la web",
    uploadCapture: "Subir captura",
    imageReady: "Imagen lista",
    analyze: "Analizar",
    visionPrompt: "Analiza esta captura y dime que ves, errores, texto importante y siguientes pasos.",
    visionPlaceholder: "Que quieres que analice?",
    selectImage: "Selecciona una imagen o captura primero.",
    noSend: "No pude enviar el mensaje",
    noSearch: "No pude buscar",
    noVision: "No pude analizar la imagen",
    active: "Activo",
    planned: "Planeado",
    enable: "Activar",
    addAsTask: "Agregar como tarea",
    mobileReady: "Optimizado para Android",
    mobileCopy: "Usalo desde Chrome y agregalo a la pantalla de inicio para sentirlo como app.",
    delete: "Eliminar",
    changeStatus: "Cambiar estado"
  },
  en: {
    subtitle: "Personal second brain",
    command: "Personal command center",
    commandCopy: "Chat, memory, tasks, Vision AI and modules to control your digital life.",
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    provider: "Model",
    installApp: "Install app",
    updateReady: "A new version is available.",
    updateNow: "Update",
    installHint: "On iOS: Share > Add to Home Screen.",
    memories: "Memories",
    openTasks: "Open",
    vision: "Vision",
    integrations: "Integrations",
    ready: "ready",
    next: "next phase",
    fallback: "fallback",
    pending: "pending",
    modules: "Modules",
    world: "World",
    worldPulse: "Current World",
    analytics: "Statistics",
    downloadPdf: "Download PDF",
    minimize: "Minimize",
    expand: "Expand",
    moveUp: "Move up",
    moveDown: "Move down",
    charts: "Charts",
    smartCharts: "Smart charts",
    chartPrompt: "Ask Sentinel for a chart",
    createChart: "Create chart",
    chartExample: "Example: create a chart of study hours: Monday 2, Tuesday 3, Wednesday 1.5",
    noCharts: "No custom charts yet. Ask the AI to create one with your data.",
    probability: "Probability",
    videoAi: "Video AI",
    notebook: "Notebook",
    automationLab: "Agent Lab",
    currencies: "Currencies",
    richestCountries: "GDP Ranking",
    growthChance: "Growth",
    uploadVideo: "Upload video",
    youtubeUrl: "YouTube URL",
    videoQuestion: "Question about the video",
    analyzeVideo: "Analyze video",
    sources: "Sources",
    addSource: "Add source",
    addNote: "Add note",
    studio: "Studio",
    formAgent: "Automate forms",
    actions: "Actions",
    career: "Career",
    activity: "Activity",
    offline: "You're offline - changes will sync when connected.",
    notifications: "Notifications",
    gps: "GPS and time",
    appUsage: "Apps",
    disableNotifications: "Disable notifications",
    enableNotifications: "Enable notifications",
    addApplication: "Add application",
    company: "Company",
    role: "Role",
    url: "URL",
    notes: "Notes",
    recruiter: "Recruiter",
    salary: "Salary expectation",
    nextAction: "Next action",
    responseRate: "Response",
    interviews: "Interviews",
    totalApplications: "Applications",
    applicationsWeek: "This week",
    careerAi: "Career AI",
    actionCenter: "Action Center",
    actionCopy: "Prepare schedules, messages, emails and automations with approval before execution.",
    approve: "Approve",
    complete: "Complete",
    cancel: "Cancel",
    manualAction: "New action",
    target: "Person/destination",
    draft: "Message or detail",
    schedule: "Schedule",
    addAction: "Create action",
    noActions: "No actions yet. Ask the agent to schedule a meeting, prepare a message or create a reminder.",
    actionPending: "Pending",
    actionApproved: "Approved",
    actionDone: "Completed",
    actionCancelled: "Cancelled",
    chat: "Chat",
    tasks: "Tasks",
    memory: "Memory",
    internet: "Internet",
    visionAI: "Vision AI",
    assistantReady: "Your assistant is ready",
    assistantHint: "Try: \"Remember that my goal is backend and cybersecurity\" or \"Task: study Docker tomorrow\".",
    you: "You",
    sentinel: "Sentinel",
    chatPlaceholder: "Write an instruction, idea or pending item...",
    send: "Send",
    importantData: "Important data",
    saveMemory: "Save memory",
    newTask: "New task",
    createTask: "Create task",
    low: "Low",
    medium: "Medium",
    high: "High",
    searchWeb: "Search the web",
    uploadCapture: "Upload capture",
    imageReady: "Image ready",
    analyze: "Analyze",
    visionPrompt: "Analyze this screenshot and tell me what you see, errors, important text and next steps.",
    visionPlaceholder: "What should I analyze?",
    selectImage: "Select an image or screenshot first.",
    noSend: "I could not send the message",
    noSearch: "I could not search",
    noVision: "I could not analyze the image",
    active: "Active",
    planned: "Planned",
    enable: "Enable",
    addAsTask: "Add as task",
    mobileReady: "Optimized for Android",
    mobileCopy: "Use it from Chrome and add it to your home screen to feel like an app.",
    delete: "Delete",
    changeStatus: "Change status"
  },
  pt: {
    subtitle: "Segundo cerebro pessoal",
    command: "Centro de comando pessoal",
    commandCopy: "Chat, memoria, tarefas, Vision AI e modulos para controlar sua vida digital.",
    language: "Idioma",
    theme: "Tema",
    light: "Claro",
    dark: "Escuro",
    provider: "Modelo",
    installApp: "Instalar app",
    updateReady: "Ha uma nova versao disponivel.",
    updateNow: "Atualizar",
    installHint: "No iOS: Compartilhar > Adicionar a tela inicial.",
    memories: "Memorias",
    openTasks: "Abertas",
    vision: "Visao",
    integrations: "Integracoes",
    ready: "pronta",
    next: "proxima fase",
    fallback: "fallback",
    pending: "pendente",
    modules: "Modulos",
    world: "Mundo",
    worldPulse: "Mundo atual",
    analytics: "Estatísticas",
    downloadPdf: "Baixar PDF",
    minimize: "Minimizar",
    expand: "Aumentar",
    moveUp: "Subir",
    moveDown: "Descer",
    charts: "Graficos",
    smartCharts: "Graficos inteligentes",
    chartPrompt: "Peca um grafico ao Sentinel",
    createChart: "Criar grafico",
    chartExample: "Ex: cria um grafico de horas de estudo: segunda 2, terca 3, quarta 1.5",
    noCharts: "Ainda nao ha graficos personalizados. Peca a IA para criar um com seus dados.",
    probability: "Probabilidade",
    videoAi: "Video AI",
    notebook: "Notebook",
    automationLab: "Agent Lab",
    currencies: "Moedas",
    richestCountries: "Ranking PIB",
    growthChance: "Crescimento",
    uploadVideo: "Enviar video",
    youtubeUrl: "URL do YouTube",
    videoQuestion: "Pergunta sobre o video",
    analyzeVideo: "Analisar video",
    sources: "Fontes",
    addSource: "Adicionar fonte",
    addNote: "Adicionar nota",
    studio: "Studio",
    formAgent: "Automatizar formularios",
    actions: "Acoes",
    career: "Carreira",
    activity: "Atividade",
    offline: "Voce esta offline - as alteracoes serao sincronizadas quando voltar.",
    notifications: "Notificacoes",
    gps: "GPS e tempo",
    appUsage: "Apps",
    disableNotifications: "Desativar notificacoes",
    enableNotifications: "Ativar notificacoes",
    addApplication: "Adicionar vaga",
    company: "Empresa",
    role: "Cargo",
    url: "URL",
    notes: "Notas",
    recruiter: "Recruiter",
    salary: "Salario esperado",
    nextAction: "Proxima acao",
    responseRate: "Resposta",
    interviews: "Entrevistas",
    totalApplications: "Aplicacoes",
    applicationsWeek: "Esta semana",
    careerAi: "IA de carreira",
    actionCenter: "Action Center",
    actionCopy: "Prepare agendas, mensagens, emails e automacoes com aprovacao antes de executar.",
    approve: "Aprovar",
    complete: "Concluir",
    cancel: "Cancelar",
    manualAction: "Nova acao",
    target: "Pessoa/destino",
    draft: "Mensagem ou detalhe",
    schedule: "Horario",
    addAction: "Criar acao",
    noActions: "Ainda nao ha acoes. Peca ao agente para agendar uma reuniao, preparar uma mensagem ou criar um lembrete.",
    actionPending: "Pendente",
    actionApproved: "Aprovada",
    actionDone: "Concluida",
    actionCancelled: "Cancelada",
    chat: "Chat",
    tasks: "Tarefas",
    memory: "Memoria",
    internet: "Internet",
    visionAI: "Vision AI",
    assistantReady: "Seu assistente esta pronto",
    assistantHint: "Teste: \"Lembre que minha meta e backend e ciberseguranca\" ou \"Tarefa: estudar Docker amanha\".",
    you: "Voce",
    sentinel: "Sentinel",
    chatPlaceholder: "Escreva uma instrucao, ideia ou pendencia...",
    send: "Enviar",
    importantData: "Dado importante",
    saveMemory: "Salvar memoria",
    newTask: "Nova tarefa",
    createTask: "Criar tarefa",
    low: "Baixa",
    medium: "Media",
    high: "Alta",
    searchWeb: "Buscar na web",
    uploadCapture: "Enviar captura",
    imageReady: "Imagem pronta",
    analyze: "Analisar",
    visionPrompt: "Analise esta captura e diga o que ve, erros, texto importante e proximos passos.",
    visionPlaceholder: "O que devo analisar?",
    selectImage: "Selecione uma imagem ou captura primeiro.",
    noSend: "Nao consegui enviar a mensagem",
    noSearch: "Nao consegui buscar",
    noVision: "Nao consegui analisar a imagem",
    active: "Ativo",
    planned: "Planejado",
    enable: "Ativar",
    addAsTask: "Adicionar como tarefa",
    mobileReady: "Otimizado para Android",
    mobileCopy: "Use pelo Chrome e adicione a tela inicial para parecer um app.",
    delete: "Excluir",
    changeStatus: "Mudar estado"
  },
  fr: {
    subtitle: "Second cerveau personnel",
    command: "Centre de commande personnel",
    commandCopy: "Chat, memoire, taches, Vision AI et modules pour controler ta vie numerique.",
    language: "Langue",
    theme: "Theme",
    light: "Clair",
    dark: "Sombre",
    provider: "Modele",
    installApp: "Installer app",
    updateReady: "Une nouvelle version est disponible.",
    updateNow: "Mettre a jour",
    installHint: "Sur iOS: Partager > Ajouter a l'ecran d'accueil.",
    memories: "Memoires",
    openTasks: "Ouvertes",
    vision: "Vision",
    integrations: "Integrations",
    ready: "prete",
    next: "phase suivante",
    fallback: "fallback",
    pending: "en attente",
    modules: "Modules",
    world: "Monde",
    worldPulse: "Monde actuel",
    analytics: "Statistiques",
    downloadPdf: "Telecharger PDF",
    minimize: "Minimiser",
    expand: "Agrandir",
    moveUp: "Monter",
    moveDown: "Descendre",
    charts: "Graphiques",
    smartCharts: "Graphiques intelligents",
    chartPrompt: "Demande un graphique a Sentinel",
    createChart: "Creer graphique",
    chartExample: "Ex: cree un graphique des heures d'etude: lundi 2, mardi 3, mercredi 1.5",
    noCharts: "Aucun graphique personnalise pour le moment. Demande a l'IA d'en creer un avec tes donnees.",
    probability: "Probabilite",
    videoAi: "Video AI",
    notebook: "Notebook",
    automationLab: "Agent Lab",
    currencies: "Devises",
    richestCountries: "Classement PIB",
    growthChance: "Croissance",
    uploadVideo: "Ajouter video",
    youtubeUrl: "URL YouTube",
    videoQuestion: "Question sur la video",
    analyzeVideo: "Analyser video",
    sources: "Sources",
    addSource: "Ajouter source",
    addNote: "Ajouter note",
    studio: "Studio",
    formAgent: "Automatiser formulaires",
    actions: "Actions",
    career: "Carriere",
    activity: "Activite",
    offline: "Tu es hors ligne - les changements seront synchronises au retour.",
    notifications: "Notifications",
    gps: "GPS et temps",
    appUsage: "Apps",
    disableNotifications: "Desactiver notifications",
    enableNotifications: "Activer notifications",
    addApplication: "Ajouter candidature",
    company: "Entreprise",
    role: "Role",
    url: "URL",
    notes: "Notes",
    recruiter: "Recruiter",
    salary: "Salaire attendu",
    nextAction: "Prochaine action",
    responseRate: "Reponse",
    interviews: "Entretiens",
    totalApplications: "Candidatures",
    applicationsWeek: "Cette semaine",
    careerAi: "IA carriere",
    actionCenter: "Action Center",
    actionCopy: "Prepare agendas, messages, emails et automatisations avec approbation avant execution.",
    approve: "Approuver",
    complete: "Terminer",
    cancel: "Annuler",
    manualAction: "Nouvelle action",
    target: "Personne/destination",
    draft: "Message ou detail",
    schedule: "Horaire",
    addAction: "Creer action",
    noActions: "Aucune action pour l'instant. Demande a l'agent de planifier une reunion, preparer un message ou creer un rappel.",
    actionPending: "En attente",
    actionApproved: "Approuvee",
    actionDone: "Terminee",
    actionCancelled: "Annulee",
    chat: "Chat",
    tasks: "Taches",
    memory: "Memoire",
    internet: "Internet",
    visionAI: "Vision AI",
    assistantReady: "Ton assistant est pret",
    assistantHint: "Essaie: \"Souviens-toi que mon objectif est backend et cybersecurite\" ou \"Tache: etudier Docker demain\".",
    you: "Toi",
    sentinel: "Sentinel",
    chatPlaceholder: "Ecris une instruction, une idee ou une tache...",
    send: "Envoyer",
    importantData: "Donnee importante",
    saveMemory: "Sauver memoire",
    newTask: "Nouvelle tache",
    createTask: "Creer tache",
    low: "Basse",
    medium: "Moyenne",
    high: "Haute",
    searchWeb: "Chercher sur le web",
    uploadCapture: "Ajouter capture",
    imageReady: "Image prete",
    analyze: "Analyser",
    visionPrompt: "Analyse cette capture et dis-moi ce que tu vois, erreurs, texte important et prochaines etapes.",
    visionPlaceholder: "Que dois-je analyser?",
    selectImage: "Selectionne d'abord une image ou une capture.",
    noSend: "Je n'ai pas pu envoyer le message",
    noSearch: "Je n'ai pas pu chercher",
    noVision: "Je n'ai pas pu analyser l'image",
    active: "Actif",
    planned: "Planifie",
    enable: "Activer",
    addAsTask: "Ajouter comme tache",
    mobileReady: "Optimise pour Android",
    mobileCopy: "Utilise-le depuis Chrome et ajoute-le a l'ecran d'accueil pour une experience app.",
    delete: "Supprimer",
    changeStatus: "Changer statut"
  }
};

const moduleCatalog = [
  { id: "workspaces", icon: SlidersHorizontal, title: "Workspaces", detail: "Personal, trabajo, backend, cyber, idiomas, finanzas y casa." },
  { id: "knowledge", icon: Brain, title: "Knowledge Base", detail: "PDF, videos, Drive, websites, notas, imagenes y audio indexados." },
  { id: "history", icon: Clipboard, title: "Full History", detail: "Preguntas, respuestas, IA usada, utilidad, costos y resultados." },
  { id: "multi-ai", icon: Bot, title: "Multi AI Router", detail: "OpenAI, Claude, Gemini, Perplexity, Grok, Ollama y Codex." },
  { id: "career", icon: BriefcaseBusiness, title: "Career Dashboard", detail: "Vacantes, entrevistas, CV, GitHub y LinkedIn." },
  { id: "learning", icon: GraduationCap, title: "Learning Coach", detail: "Plan de estudio, preguntas, progreso y repasos." },
  { id: "security", icon: ShieldCheck, title: "Cybersecurity", detail: "CVEs, SIEM, OWASP, MITRE, IOC y laboratorios." },
  { id: "documents", icon: FileText, title: "Documents", detail: "PDF, Word, Excel, diagramas y contratos." },
  { id: "meetings", icon: CalendarDays, title: "Meetings", detail: "Actas, tareas, resumen y calendario." },
  { id: "voice", icon: Mic, title: "Voice Assistant", detail: "Dictado, respuestas habladas y subtitulos." },
  { id: "mobile", icon: Smartphone, title: "Mobile App", detail: "Android, camara, notificaciones y acciones rapidas." },
  { id: "finance", icon: WalletCards, title: "Finance", detail: "Gastos, ingresos, presupuesto y ahorro." },
  { id: "health", icon: HeartPulse, title: "Health Habits", detail: "Sueno, agua, gym, pasos y habitos." },
  { id: "gmail", icon: Mail, title: "Gmail", detail: "Correos importantes, recruiters y respuestas." },
  { id: "github", icon: Github, title: "GitHub", detail: "Repos, commits, issues y mejoras tecnicas." },
  { id: "goals", icon: Target, title: "Goal Tracker", detail: "Objetivos, progreso, alertas y prioridades." }
];

export function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [vision, setVision] = useState<VisionItem[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [career, setCareer] = useState<JobApplication[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [charts, setCharts] = useState<CustomChart[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: true,
    activityAlerts: true,
    careerReminders: true,
    locationInsights: true
  });
  const [integrations, setIntegrations] = useState<Record<string, { configured: boolean; label: string; fallback?: string; next?: boolean }>>({});
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [provider, setProvider] = useState<ProviderName>("auto");
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("sentinel-language") as Language) || "es");
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("sentinel-theme") as Theme) || "light");
  const [activeView, setActiveView] = useState<ViewKey>("chat");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCompact, setSidebarCompact] = useState(() => localStorage.getItem("sentinel-sidebar-compact") === "true");
  const [navSettingsOpen, setNavSettingsOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [activeModules, setActiveModules] = useState<string[]>(() => JSON.parse(localStorage.getItem("sentinel-modules") || "[]"));
  const [hiddenNavItems, setHiddenNavItems] = useState<ViewKey[]>(() => JSON.parse(localStorage.getItem("sentinel-hidden-nav") || "[]"));
  const [panelOrder, setPanelOrder] = useState<ViewKey[]>(() => JSON.parse(localStorage.getItem("sentinel-panel-order") || JSON.stringify(defaultPanelOrder)));
  const [collapsedPanels, setCollapsedPanels] = useState<ViewKey[]>(() => JSON.parse(localStorage.getItem("sentinel-collapsed-panels") || "[]"));
  const [expandedPanel, setExpandedPanel] = useState<ViewKey | null>(() => (localStorage.getItem("sentinel-expanded-panel") as ViewKey | null) || null);
  const [globeRotation, setGlobeRotation] = useState({ x: 0, y: 0 });
  const [globeDragStart, setGlobeDragStart] = useState<{ x: number; y: number } | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [applyUpdate, setApplyUpdate] = useState<(() => Promise<void>) | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [memoryInput, setMemoryInput] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskItem["priority"]>("medium");
  const [actionType, setActionType] = useState<ActionType>("message");
  const [actionTitle, setActionTitle] = useState("");
  const [actionTarget, setActionTarget] = useState("");
  const [actionDraft, setActionDraft] = useState("");
  const [actionSchedule, setActionSchedule] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [careerForm, setCareerForm] = useState({
    company: "",
    role: "",
    date: new Date().toISOString().slice(0, 10),
    url: "",
    status: "applied" as JobStatus,
    notes: "",
    recruiterName: "",
    recruiterEmail: "",
    salaryExpectation: "",
    nextActionReminder: ""
  });
  const [careerPrompt, setCareerPrompt] = useState("Prepare me for my interview");
  const [careerAiReply, setCareerAiReply] = useState("");
  const [worldPulse, setWorldPulse] = useState<WorldPulse | null>(null);
  const [chartPrompt, setChartPrompt] = useState("Crea una grafica de horas de estudio: lunes 2, martes 3, miercoles 1.5, jueves 4");
  const [chartKind, setChartKind] = useState<ChartKind>("bar");
  const [videoQuestion, setVideoQuestion] = useState("Resume este video y dime las ideas importantes.");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoData, setVideoData] = useState("");
  const [videoMimeType, setVideoMimeType] = useState("");
  const [sources, setSources] = useState<string[]>(() => JSON.parse(localStorage.getItem("sentinel-sources") || "[]"));
  const [notes, setNotes] = useState<string[]>(() => JSON.parse(localStorage.getItem("sentinel-notes") || "[]"));
  const [sourceInput, setSourceInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [visionPrompt, setVisionPrompt] = useState(translations.es.visionPrompt);
  const [visionImage, setVisionImage] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const t = translations[language];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("sentinel-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem("sentinel-language", language);
    setVisionPrompt((current) => Object.values(translations).some((item) => item.visionPrompt === current) ? translations[language].visionPrompt : current);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("sentinel-modules", JSON.stringify(activeModules));
  }, [activeModules]);

  useEffect(() => {
    localStorage.setItem("sentinel-hidden-nav", JSON.stringify(hiddenNavItems));
  }, [hiddenNavItems]);

  useEffect(() => {
    localStorage.setItem("sentinel-panel-order", JSON.stringify(panelOrder));
  }, [panelOrder]);

  useEffect(() => {
    localStorage.setItem("sentinel-collapsed-panels", JSON.stringify(collapsedPanels));
  }, [collapsedPanels]);

  useEffect(() => {
    if (expandedPanel) localStorage.setItem("sentinel-expanded-panel", expandedPanel);
    else localStorage.removeItem("sentinel-expanded-panel");
  }, [expandedPanel]);

  useEffect(() => {
    localStorage.setItem("sentinel-sidebar-compact", String(sidebarCompact));
  }, [sidebarCompact]);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsStandalone(standalone);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh() {
        setUpdateReady(true);
        setApplyUpdate(() => () => updateServiceWorker(true));
      },
      onOfflineReady() {
        setOnline(navigator.onLine);
      }
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("sentinel-sources", JSON.stringify(sources));
  }, [sources]);

  useEffect(() => {
    localStorage.setItem("sentinel-notes", JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      syncWhenOnline().then(() => api.bootstrap()).then((data) => {
        setCareer(data.career);
        cacheBootstrap({ tasks: data.tasks, career: data.career, messages: data.messages });
      }).catch(() => undefined);
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    api.bootstrap()
      .then((data) => {
        setMessages(data.messages);
        setMemory(data.memory);
        setTasks(data.tasks);
        setVision(data.vision);
        setActions(data.actions);
        setCareer(data.career);
        setActivity(data.activity);
        setCharts(data.charts);
        setNotificationSettings(data.notificationSettings);
        cacheBootstrap({ tasks: data.tasks, career: data.career, messages: data.messages });
        setIntegrations(data.integrations);
        const latest = data.messages.at(-1);
        if (latest) setConversationId(latest.conversationId);
      })
      .catch(async (err) => {
        const offline = await loadOfflineSnapshot();
        setTasks(offline.tasks);
        setCareer(offline.career);
        setMessages(offline.messages);
        setError(err.message);
      });
  }, []);

  useEffect(() => {
    api.worldPulse(language).then(setWorldPulse).catch(() => undefined);
  }, [language]);

  useEffect(() => {
    const wsUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:4100/ws`;
    const socket = new WebSocket(wsUrl);
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as { type: string };
      if (message.type.startsWith("career:") || message.type.startsWith("activity:") || message.type.startsWith("notifications:") || message.type.startsWith("charts:")) {
        api.bootstrap().then((data) => {
          setCareer(data.career);
          setActivity(data.activity);
          setCharts(data.charts);
          setNotificationSettings(data.notificationSettings);
        }).catch(() => undefined);
      }
    };
    return () => socket.close();
  }, []);

  const activeMessages = useMemo(
    () => messages.filter((message) => !conversationId || message.conversationId === conversationId),
    [messages, conversationId]
  );

  const openTasks = tasks.filter((task) => task.status === "open");
  const pendingActions = actions.filter((action) => action.status === "pending" || action.status === "approved");
  const navItems: { key: ViewKey; label: string; icon: ReactNode }[] = [
    { key: "chat", label: t.chat, icon: <Bot size={17} /> },
    { key: "world", label: t.world, icon: <Globe2 size={17} /> },
    { key: "analytics", label: t.analytics, icon: <BarChart3 size={17} /> },
    { key: "video", label: t.videoAi, icon: <Video size={17} /> },
    { key: "notebook", label: t.notebook, icon: <BookOpen size={17} /> },
    { key: "actions", label: t.actions, icon: <Play size={17} /> },
    { key: "career", label: t.career, icon: <BriefcaseBusiness size={17} /> },
    { key: "activity", label: t.activity, icon: <MapPin size={17} /> },
    { key: "tasks", label: t.tasks, icon: <CheckCircle2 size={17} /> },
    { key: "memory", label: t.memory, icon: <Brain size={17} /> },
    { key: "vision", label: t.visionAI, icon: <ImagePlus size={17} /> },
    { key: "search", label: t.internet, icon: <Globe2 size={17} /> },
    { key: "modules", label: t.modules, icon: <Target size={17} /> }
  ];
  const visibleNavItems = navItems.filter((item) => !hiddenNavItems.includes(item.key));
  const languageOptions: { key: Language; label: string; name: string }[] = [
    { key: "es", label: "ES", name: "Español" },
    { key: "en", label: "EN", name: "English" },
    { key: "pt", label: "PT", name: "Português" },
    { key: "fr", label: "FR", name: "Français" }
  ];

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!chatInput.trim()) return;
    const value = chatInput.trim();
    setChatInput("");
    setBusy(true);
    setError("");
    try {
      const data = await api.chat(value, provider, conversationId);
      setConversationId(data.conversation.id);
      setMessages((current) => [...current, ...data.messages]);
      const refreshed = await api.bootstrap();
      setMemory(refreshed.memory);
      setTasks(refreshed.tasks);
      setActions(refreshed.actions);
      setCharts(refreshed.charts);
      setActiveView(refreshed.charts.length > charts.length ? "analytics" : "chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.noSend);
    } finally {
      setBusy(false);
    }
  }

  async function addMemory(event: FormEvent) {
    event.preventDefault();
    if (!memoryInput.trim()) return;
    const item = await api.addMemory(memoryInput.trim(), ["manual"], 4);
    setMemory((current) => [item, ...current]);
    setMemoryInput("");
  }

  async function addTask(event: FormEvent) {
    event.preventDefault();
    if (!taskInput.trim()) return;
    const item = await api.addTask(taskInput.trim(), taskPriority);
    setTasks((current) => [item, ...current]);
    setTaskInput("");
  }

  async function addAction(event: FormEvent) {
    event.preventDefault();
    if (!actionTitle.trim()) return;
    const item = await api.addAction({
      type: actionType,
      title: actionTitle.trim(),
      target: actionTarget.trim() || undefined,
      draft: actionDraft.trim() || undefined,
      scheduledFor: actionSchedule.trim() || undefined
    });
    setActions((current) => [item, ...current]);
    setActionTitle("");
    setActionTarget("");
    setActionDraft("");
    setActionSchedule("");
  }

  async function createSmartChart(event: FormEvent) {
    event.preventDefault();
    if (!chartPrompt.trim()) return;
    setBusy(true);
    setError("");
    try {
      const item = await api.createChart(chartPrompt.trim(), { kind: chartKind });
      setCharts((current) => [item, ...current]);
      setChartPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude crear la grafica");
    } finally {
      setBusy(false);
    }
  }

  async function removeChart(id: string) {
    await api.deleteChart(id);
    setCharts((current) => current.filter((item) => item.id !== id));
  }

  async function createAutomationTemplate(title: string, draft: string) {
    const item = await api.addAction({
      type: "automation",
      title,
      draft
    });
    setActions((current) => [item, ...current]);
  }

  async function addCareerApplication(event: FormEvent) {
    event.preventDefault();
    if (!careerForm.company.trim() || !careerForm.role.trim()) return;
    const now = new Date().toISOString();
    const localItem: JobApplication = {
      id: crypto.randomUUID(),
      ...careerForm,
      synced: online,
      createdAt: now,
      updatedAt: now
    };
    setCareer((current) => [localItem, ...current]);
    await offlineDb.career.put(localItem);

    if (online) {
      const saved = await api.addCareerApplication(careerForm);
      setCareer((current) => current.map((item) => (item.id === localItem.id ? saved : item)));
      await offlineDb.career.put(saved);
    } else {
      await queueSync({ entity: "career", operation: "create", payload: localItem });
    }

    setCareerForm({
      company: "",
      role: "",
      date: new Date().toISOString().slice(0, 10),
      url: "",
      status: "applied",
      notes: "",
      recruiterName: "",
      recruiterEmail: "",
      salaryExpectation: "",
      nextActionReminder: ""
    });
  }

  async function askCareerAi(prompt: string) {
    setBusy(true);
    try {
      const reply = await api.careerAi(prompt, provider);
      setCareerAiReply(reply.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.noSend);
    } finally {
      setBusy(false);
    }
  }

  async function addCurrentLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (position) => {
      const item = await api.addActivity({
        type: "location",
        title: "GPS check-in",
        detail: "Location captured from browser permission",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        occurredAt: new Date().toISOString()
      });
      setActivity((current) => [item, ...current]);
    });
  }

  async function addAppUsage() {
    const appName = window.prompt("App name");
    const minutes = Number(window.prompt("Minutes") ?? 0);
    if (!appName || !minutes) return;
    const item = await api.addActivity({
      type: "app_usage",
      title: `${appName}: ${minutes} min`,
      appName,
      durationMinutes: minutes,
      occurredAt: new Date().toISOString()
    });
    setActivity((current) => [item, ...current]);
  }

  async function toggleNotifications() {
    const updated = await api.updateNotificationSettings({ enabled: !notificationSettings.enabled });
    setNotificationSettings(updated);
  }

  async function analyzeVideo(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const reply = await api.analyzeVideo({
        question: videoQuestion,
        youtubeUrl: youtubeUrl || undefined,
        videoData: videoData || undefined,
        mimeType: videoMimeType || undefined
      });
      const conversation = await api.chat(`Video AI: ${videoQuestion}`, "local", conversationId);
      setConversationId(conversation.conversation.id);
      setMessages((current) => [
        ...current,
        ...conversation.messages.slice(0, 1),
        {
          id: crypto.randomUUID(),
          conversationId: conversation.conversation.id,
          role: "assistant",
          content: reply.content,
          provider: reply.provider,
          createdAt: new Date().toISOString()
        }
      ]);
      setActiveView("chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.noVision);
    } finally {
      setBusy(false);
    }
  }

  function handleVideoFile(file?: File) {
    if (!file) return;
    setVideoMimeType(file.type || "video/mp4");
    const reader = new FileReader();
    reader.onload = () => setVideoData(String(reader.result));
    reader.readAsDataURL(file);
  }

  function addSource(event: FormEvent) {
    event.preventDefault();
    if (!sourceInput.trim()) return;
    setSources((current) => [sourceInput.trim(), ...current]);
    setSourceInput("");
  }

  function addNote(event: FormEvent) {
    event.preventDefault();
    if (!noteInput.trim()) return;
    setNotes((current) => [noteInput.trim(), ...current]);
    setNoteInput("");
  }

  async function updateActionStatus(action: ActionItem, status: ActionStatus) {
    const updated = await api.updateAction(action.id, { status });
    setActions((current) => current.map((item) => (item.id === action.id ? updated : item)));
  }

  async function removeAction(id: string) {
    await api.deleteAction(id);
    setActions((current) => current.filter((item) => item.id !== id));
  }

  async function addModuleTask(title: string) {
    const item = await api.addTask(`${t.modules}: ${title}`, "medium");
    setTasks((current) => [item, ...current]);
    setActiveView("tasks");
  }

  async function toggleTask(task: TaskItem) {
    const updated = await api.updateTask(task.id, { status: task.status === "open" ? "done" : "open" });
    setTasks((current) => current.map((item) => (item.id === task.id ? updated : item)));
  }

  async function removeTask(id: string) {
    await api.deleteTask(id);
    setTasks((current) => current.filter((item) => item.id !== id));
  }

  async function removeMemory(id: string) {
    await api.deleteMemory(id);
    setMemory((current) => current.filter((item) => item.id !== id));
  }

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    if (!searchInput.trim()) return;
    setBusy(true);
    setError("");
    try {
      setSearchResults(await api.search(searchInput.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.noSearch);
    } finally {
      setBusy(false);
    }
  }

  async function analyzeVision(event: FormEvent) {
    event.preventDefault();
    if (!visionImage) {
      setError(t.selectImage);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const item = await api.analyzeVision(visionPrompt, visionImage, provider);
      setVision((current) => [item, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.noVision);
    } finally {
      setBusy(false);
    }
  }

  async function removeVision(id: string) {
    await api.deleteVision(id);
    setVision((current) => current.filter((item) => item.id !== id));
  }

  function handleVisionFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setVisionImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  function toggleModule(id: string) {
    setActiveModules((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function switchView(view: ViewKey) {
    setActiveView(view);
    setMobileNavOpen(false);
  }

  function toggleNavItem(view: ViewKey) {
    if (view === activeView) return;
    setHiddenNavItems((current) => current.includes(view) ? current.filter((item) => item !== view) : [...current, view]);
  }

  function movePanel(view: ViewKey, direction: -1 | 1) {
    setPanelOrder((current) => {
      const next = [...new Set([...current, ...defaultPanelOrder])];
      const index = next.indexOf(view);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function togglePanelCollapse(view: ViewKey) {
    setCollapsedPanels((current) => current.includes(view) ? current.filter((item) => item !== view) : [...current, view]);
  }

  function panelProps(view: ViewKey) {
    return {
      order: panelOrder.indexOf(view) === -1 ? defaultPanelOrder.indexOf(view) : panelOrder.indexOf(view),
      collapsed: collapsedPanels.includes(view),
      expanded: expandedPanel === view,
      labels: { minimize: t.minimize, expand: t.expand, moveUp: t.moveUp, moveDown: t.moveDown },
      onMoveUp: () => movePanel(view, -1),
      onMoveDown: () => movePanel(view, 1),
      onToggleCollapse: () => togglePanelCollapse(view),
      onToggleExpand: () => setExpandedPanel((current) => current === view ? null : view)
    };
  }

  async function downloadPdf(title: string, content: string, rows?: Record<string, string | number | boolean | null>[]) {
    const blob = await api.downloadPdf({ title, content, rows });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function startGlobeDrag(clientX: number, clientY: number) {
    setGlobeDragStart({ x: clientX, y: clientY });
  }

  function moveGlobe(clientX: number, clientY: number) {
    if (!globeDragStart) return;
    setGlobeRotation((current) => ({
      x: Math.max(-35, Math.min(35, current.x + (clientY - globeDragStart.y) * 0.12)),
      y: current.y + (clientX - globeDragStart.x) * 0.18
    }));
    setGlobeDragStart({ x: clientX, y: clientY });
  }

  async function installApp() {
    if (!installPrompt) {
      window.alert(t.installHint);
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <main className={`app-shell ${sidebarCompact ? "compact-sidebar" : ""}`}>
      <aside className={`sidebar ${mobileNavOpen ? "open" : ""} ${sidebarCompact ? "compact" : ""}`}>
        <div className="brand">
          <div className="brand-mark" aria-label="Sentinel logo">
            <Shield size={25} />
            <Eye size={14} />
            <Crosshair size={10} />
          </div>
          <div>
            <h1>Sentinel AI OS</h1>
            <p>{t.subtitle}</p>
          </div>
        </div>

        <div className="nav-tools">
          <button onClick={() => setSidebarCompact((value) => !value)} title={sidebarCompact ? "Expand" : "Compact"}>
            <SlidersHorizontal size={16} />
            <span>{sidebarCompact ? "Expand" : "Compact"}</span>
          </button>
          <button onClick={() => setNavSettingsOpen((value) => !value)} title="Customize navigation">
            <EyeOff size={16} />
            <span>Hide</span>
          </button>
        </div>

        {navSettingsOpen && (
          <section className="nav-settings">
            {navItems.map((item) => (
              <label key={item.key} className={hiddenNavItems.includes(item.key) ? "hidden" : ""}>
                <input
                  type="checkbox"
                  checked={!hiddenNavItems.includes(item.key)}
                  disabled={item.key === activeView}
                  onChange={() => toggleNavItem(item.key)}
                />
                {item.icon}
                <span>{item.label}</span>
              </label>
            ))}
          </section>
        )}

        <nav className="nav-list">
          {visibleNavItems.map((item) => (
            <button className={activeView === item.key ? "active" : ""} key={item.key} onClick={() => switchView(item.key)}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <section className="metric-grid">
          <Metric icon={<Brain size={18} />} label={t.memories} value={memory.length} />
          <Metric icon={<CheckCircle2 size={18} />} label={t.openTasks} value={openTasks.length} />
          <Metric icon={<Play size={18} />} label={t.actions} value={pendingActions.length} />
        </section>

        <section className="panel integrations-panel">
          <div className="panel-title">
            <KeyRound size={17} />
            <h2>{t.integrations}</h2>
          </div>
          <div className="integration-list">
            {Object.entries(integrations).map(([key, item]) => (
              <button className="integration" key={key} onClick={() => addModuleTask(item.label)}>
                <span className={item.configured ? "dot ready" : "dot"} />
                <span>{item.label}</span>
                <small>{item.configured ? t.ready : item.next ? t.next : item.fallback ? t.fallback : t.pending}</small>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNavOpen((value) => !value)} title="Menu">
            {mobileNavOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <div className="topbar-copy">
            <h2>{t.command}</h2>
            <p>{t.commandCopy}</p>
          </div>
          <div className="control-cluster">
            {!isStandalone && (
              <button className="install-button" onClick={installApp} title={t.installApp}>
                <Download size={17} />
                <span>{t.installApp}</span>
              </button>
            )}
            <div className={`language-picker ${languageMenuOpen ? "open" : ""}`} title={t.language}>
              <button className="language-trigger" onClick={() => setLanguageMenuOpen((value) => !value)}>
                <Languages size={17} />
                <span>{languageOptions.find((item) => item.key === language)?.label}</span>
                <ChevronDown size={15} />
              </button>
              <div className="language-menu">
                {languageOptions.map((item) => (
                  <button
                    className={language === item.key ? "selected" : ""}
                    key={item.key}
                    onClick={() => {
                      setLanguage(item.key);
                      setLanguageMenuOpen(false);
                    }}
                  >
                    <span>{item.label}</span>
                    <small>{item.name}</small>
                  </button>
                ))}
              </div>
            </div>
            <button className="theme-toggle" onClick={() => setTheme(theme === "light" ? "dark" : "light")} title={t.theme}>
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
              <span>{theme === "light" ? t.dark : t.light}</span>
            </button>
            <label className="control-select" title={t.provider}>
              <Bot size={17} />
              <select value={provider} onChange={(event) => setProvider(event.target.value as ProviderName)}>
                <option value="auto">Auto</option>
                <option value="openai">OpenAI</option>
                <option value="claude">Claude</option>
                <option value="gemini">Gemini</option>
                <option value="ollama">Ollama</option>
                <option value="local">Local</option>
              </select>
            </label>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}
        {updateReady && (
          <div className="pwa-banner">
            <span>{t.updateReady}</span>
            <button onClick={() => applyUpdate?.()}>{t.updateNow}</button>
          </div>
        )}
        {!online && (
          <div className="offline-banner">
            <WifiOff size={17} />
            <span>{t.offline}</span>
          </div>
        )}

        <section className="mobile-callout">
          <Smartphone size={18} />
          <div>
            <strong>{t.mobileReady}</strong>
            <span>{t.mobileCopy}</span>
          </div>
        </section>

        <div className="content-grid">
          <section className={`chat-panel ${activeView === "chat" ? "active-view" : ""}`}>
            <div className="messages">
              {activeMessages.length === 0 && (
                <div className="empty-state">
                  <Bot size={32} />
                  <h3>{t.assistantReady}</h3>
                  <p>{t.assistantHint}</p>
                </div>
              )}
              {activeMessages.map((message) => (
                <article className={`message ${message.role}`} key={message.id}>
                  <div className="message-meta">
                    <span>{message.role === "user" ? t.you : t.sentinel}</span>
                    {message.provider && <small>{message.provider}</small>}
                  </div>
                  <p>{message.content}</p>
                  <MessageActions message={message} />
                </article>
              ))}
              {busy && (
                <article className="message assistant thinking-message">
                  <div className="sentinel-thinking" aria-label="Sentinel thinking">
                    <Shield size={28} />
                    <Eye size={15} />
                    <Crosshair size={18} />
                  </div>
                  <span>Sentinel thinking...</span>
                </article>
              )}
            </div>
            <form className="composer" onSubmit={sendMessage}>
              <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder={t.chatPlaceholder} />
              <button type="submit" disabled={busy} title={t.send}>
                {busy ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
              </button>
            </form>
          </section>

          <aside className="right-rail">
            <Panel icon={<Globe2 size={17} />} title={t.worldPulse} view="world" activeView={activeView} {...panelProps("world")}>
              <div className="world-layout">
                <div className="globe-card">
                  <div
                    className="globe"
                    style={{ "--globe-rotate-x": `${globeRotation.x}deg`, "--globe-rotate-y": `${globeRotation.y}deg` } as CSSProperties}
                    onMouseDown={(event) => startGlobeDrag(event.clientX, event.clientY)}
                    onMouseMove={(event) => moveGlobe(event.clientX, event.clientY)}
                    onMouseUp={() => setGlobeDragStart(null)}
                    onMouseLeave={() => setGlobeDragStart(null)}
                    onTouchStart={(event) => startGlobeDrag(event.touches[0].clientX, event.touches[0].clientY)}
                    onTouchMove={(event) => moveGlobe(event.touches[0].clientX, event.touches[0].clientY)}
                    onTouchEnd={() => setGlobeDragStart(null)}
                  >
                    {worldPulse?.news.map((item, index) => (
                      <span
                        className={`map-pin impact-${item.impact}`}
                        style={{ left: `${((item.lng + 180) / 360) * 100}%`, top: `${((90 - item.lat) / 180) * 100}%` }}
                        key={`${item.country}-${index}`}
                        title={`${item.city}: ${item.title}`}
                      />
                    ))}
                  </div>
                  <small>{worldPulse ? new Date(worldPulse.updatedAt).toLocaleString() : "Loading world pulse..."}</small>
                </div>
                <div className="news-list">
                  {worldPulse?.news.map((item) => (
                    <a href={item.link} target="_blank" rel="noreferrer" className="news-card" key={`${item.country}-${item.title}`}>
                      <strong>{item.country} · {item.city}</strong>
                      <span>{item.title}</span>
                      <em>{item.impact}</em>
                    </a>
                  ))}
                </div>
              </div>
              <div className="market-grid">
                <section>
                  <h3>{t.currencies}</h3>
                  {worldPulse?.currencies.map((item) => (
                    <div className="market-row" key={item.code}>
                      <span>{item.code}</span>
                      <strong>{Number(item.value).toLocaleString()}</strong>
                    </div>
                  ))}
                  {worldPulse?.gold && (
                    <div className="market-row gold">
                      <span>{worldPulse.gold.label}</span>
                      <strong>{worldPulse.gold.value}</strong>
                      <em>{worldPulse.gold.change}</em>
                    </div>
                  )}
                  {worldPulse?.bitcoin && (
                    <div className="market-row bitcoin">
                      <span>{worldPulse.bitcoin.label}</span>
                      <strong>{formatMoneyValue(worldPulse.bitcoin.value, "$")}</strong>
                      <em>{worldPulse.bitcoin.change24h} · COP {worldPulse.bitcoin.cop ? Number(worldPulse.bitcoin.cop).toLocaleString() : "n/a"}</em>
                    </div>
                  )}
                </section>
                <section>
                  <h3>{t.richestCountries}</h3>
                  {worldPulse?.economies.map((item) => (
                    <div className="economy-row" key={`${item.rank}-${item.country}`}>
                      <span>#{item.rank} {item.country}</span>
                      <strong>${item.gdpUsdT}T</strong>
                      <em>{item.growthProbability}% {t.growthChance}</em>
                    </div>
                  ))}
                </section>
              </div>
              <button
                className="wide-button"
                onClick={() => downloadPdf(
                  t.worldPulse,
                  [
                    "Top news:",
                    ...(worldPulse?.news.map((item) => `${item.country} - ${item.city}: ${item.title}`) ?? []),
                    "",
                    `Gold: ${worldPulse?.gold.value ?? "n/a"}`,
                    `Bitcoin: ${worldPulse?.bitcoin?.value ?? "n/a"}`
                  ].join("\n"),
                  worldPulse?.economies.map((item) => ({ rank: item.rank, country: item.country, gdpUsdT: item.gdpUsdT, growthProbability: item.growthProbability }))
                )}
              >
                <Download size={17} />{t.downloadPdf}
              </button>
            </Panel>

            <Panel icon={<BarChart3 size={17} />} title={t.analytics} view="analytics" activeView={activeView} {...panelProps("analytics")}>
              <div className="analytics-grid">
                <div className="stat-card">
                  <span>{t.totalApplications}</span>
                  <strong>{career.length}</strong>
                  <div className="mini-bar"><i style={{ width: `${Math.min(100, career.length * 8)}%` }} /></div>
                </div>
                <div className="stat-card">
                  <span>{t.responseRate}</span>
                  <strong>{careerResponseRate(career)}%</strong>
                  <div className="mini-bar"><i style={{ width: `${careerResponseRate(career)}%` }} /></div>
                </div>
                <div className="stat-card">
                  <span>{t.probability}</span>
                  <strong>{Math.round(((worldPulse?.economies.find((item) => item.country === "Colombia")?.growthProbability ?? 62) + careerResponseRate(career)) / 2)}%</strong>
                  <div className="mini-bar"><i style={{ width: `${Math.round(((worldPulse?.economies.find((item) => item.country === "Colombia")?.growthProbability ?? 62) + careerResponseRate(career)) / 2)}%` }} /></div>
                </div>
              </div>
              <div className="chart-panel">
                <h3>{t.charts}</h3>
                {worldPulse?.economies.slice(0, 8).map((item) => (
                  <div className="chart-row" key={item.country}>
                    <span>{item.country}</span>
                    <div><i style={{ width: `${item.growthProbability}%` }} /></div>
                    <strong>{item.growthProbability}%</strong>
                  </div>
                ))}
              </div>
              <div className="smart-chart-panel">
                <div className="panel-title mini-title">
                  <span className="panel-heading">
                    <BarChart3 size={16} />
                    <h3>{t.smartCharts}</h3>
                  </span>
                </div>
                <form className="smart-chart-form" onSubmit={createSmartChart}>
                  <textarea
                    value={chartPrompt}
                    onChange={(event) => setChartPrompt(event.target.value)}
                    placeholder={t.chartPrompt}
                    rows={3}
                  />
                  <div className="chart-form-row">
                    <select value={chartKind} onChange={(event) => setChartKind(event.target.value as ChartKind)}>
                      <option value="bar">Bar</option>
                      <option value="line">Line</option>
                      <option value="pie">Pie</option>
                      <option value="table">Table</option>
                    </select>
                    <button disabled={busy}><Plus size={17} />{t.createChart}</button>
                  </div>
                  <small>{t.chartExample}</small>
                </form>
                {charts.length === 0 ? (
                  <p className="empty-mini">{t.noCharts}</p>
                ) : (
                  <div className="custom-chart-grid">
                    {charts.map((chart) => (
                      <CustomChartCard key={chart.id} chart={chart} onDelete={() => removeChart(chart.id)} />
                    ))}
                  </div>
                )}
              </div>
              <button
                className="wide-button"
                onClick={() => downloadPdf(
                  t.analytics,
                  `Applications: ${career.length}\nResponse rate: ${careerResponseRate(career)}%\nInterviews: ${career.filter((item) => item.status === "interview").length}\n\nCustom charts:\n${charts.map((chart) => `${chart.title}: ${chart.labels.map((label, index) => `${label}=${chart.values[index]}`).join(", ")}`).join("\n")}`,
                  [
                    ...career.map((item) => ({ company: item.company, role: item.role, status: item.status, date: item.date })),
                    ...charts.flatMap((chart) => chart.labels.map((label, index) => ({ chart: chart.title, label, value: chart.values[index], unit: chart.unit ?? "" })))
                  ]
                )}
              >
                <Download size={17} />{t.downloadPdf}
              </button>
            </Panel>

            <Panel icon={<Video size={17} />} title={t.videoAi} view="video" activeView={activeView} {...panelProps("video")}>
              <form className="video-form" onSubmit={analyzeVideo}>
                <input value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder={t.youtubeUrl} />
                <label className="file-picker">
                  <Video size={18} />
                  <span>{videoData ? "Video ready" : t.uploadVideo}</span>
                  <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => handleVideoFile(event.target.files?.[0])} />
                </label>
                <textarea value={videoQuestion} onChange={(event) => setVideoQuestion(event.target.value)} placeholder={t.videoQuestion} />
                <button className="wide-button" disabled={busy}><Video size={17} />{t.analyzeVideo}</button>
              </form>
            </Panel>

            <Panel icon={<BookOpen size={17} />} title={t.notebook} view="notebook" activeView={activeView} {...panelProps("notebook")}>
              <div className="notebook-grid">
                <section className="notebook-column">
                  <h3>{t.sources}</h3>
                  <form className="inline-form" onSubmit={addSource}>
                    <input value={sourceInput} onChange={(event) => setSourceInput(event.target.value)} placeholder={t.addSource} />
                    <button><Plus size={17} /></button>
                  </form>
                  {sources.map((source, index) => <div className="note-chip" key={`${source}-${index}`}>{source}</div>)}
                </section>
                <section className="notebook-column">
                  <h3>{t.studio}</h3>
                  <div className="studio-grid">
                    {["Audio Overview", "Video Overview", "Mind Map", "Reports", "Flashcards", "Quiz", "Infographic", "Data Table"].map((item) => (
                      <button key={item}><Wand2 size={15} />{item}</button>
                    ))}
                  </div>
                </section>
              </div>
              <form className="note-form" onSubmit={addNote}>
                <textarea value={noteInput} onChange={(event) => setNoteInput(event.target.value)} placeholder={t.addNote} />
                <button className="wide-button"><Plus size={17} />{t.addNote}</button>
              </form>
              <div className="notes-list">
                {notes.map((note, index) => <article className="note-card" key={`${note}-${index}`}>{note}</article>)}
              </div>
            </Panel>

            <Panel icon={<Play size={17} />} title={t.actionCenter} view="actions" activeView={activeView} {...panelProps("actions")}>
              <p className="panel-copy">{t.actionCopy}</p>
              <div className="agent-lab">
                <h3>{t.automationLab}</h3>
                <button onClick={() => createAutomationTemplate(t.formAgent, "Open the form, read fields, prepare answers from my profile, ask for approval before submit.")}>
                  <Wand2 size={15} />{t.formAgent}
                </button>
                <button onClick={() => createAutomationTemplate("Message suggestions", "Suggest 3 message options for this person, tone: professional, friendly, concise.")}>
                  <Mail size={15} />Message suggestions
                </button>
                <button onClick={() => createAutomationTemplate("Browser task", "Navigate, collect information, summarize, and ask before final action.")}>
                  <Globe2 size={15} />Browser task
                </button>
              </div>
              <form className="action-form" onSubmit={addAction}>
                <select value={actionType} onChange={(event) => setActionType(event.target.value as ActionType)}>
                  <option value="message">Message</option>
                  <option value="email">Email</option>
                  <option value="schedule">Schedule</option>
                  <option value="reminder">Reminder</option>
                  <option value="automation">Automation</option>
                </select>
                <input value={actionTitle} onChange={(event) => setActionTitle(event.target.value)} placeholder={t.manualAction} />
                <input value={actionTarget} onChange={(event) => setActionTarget(event.target.value)} placeholder={t.target} />
                <input value={actionSchedule} onChange={(event) => setActionSchedule(event.target.value)} placeholder={t.schedule} />
                <textarea value={actionDraft} onChange={(event) => setActionDraft(event.target.value)} placeholder={t.draft} rows={3} />
                <button className="wide-button"><Plus size={17} />{t.addAction}</button>
              </form>
              <div className="action-list">
                {actions.length === 0 && <p className="empty-mini">{t.noActions}</p>}
                {actions.slice(0, 8).map((action) => (
                  <article className={`action-card ${action.status}`} key={action.id}>
                    <div>
                      <strong>{action.title}</strong>
                      <span>{actionLabel(action.status, t)}</span>
                    </div>
                    {(action.target || action.scheduledFor) && (
                      <small>{[action.target, action.scheduledFor].filter(Boolean).join(" · ")}</small>
                    )}
                    {action.draft && <p>{action.draft}</p>}
                    <div className="action-buttons">
                      <button onClick={() => updateActionStatus(action, "approved")} title={t.approve}><ThumbsUp size={15} />{t.approve}</button>
                      <button onClick={() => updateActionStatus(action, "done")} title={t.complete}><CheckCircle2 size={15} />{t.complete}</button>
                      <button onClick={() => updateActionStatus(action, "cancelled")} title={t.cancel}><ThumbsDown size={15} />{t.cancel}</button>
                      <button onClick={() => removeAction(action.id)} title={t.delete}><Trash2 size={15} /></button>
                    </div>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel icon={<BriefcaseBusiness size={17} />} title={t.career} view="career" activeView={activeView} {...panelProps("career")}>
              <div className="career-stats">
                <Metric icon={<BriefcaseBusiness size={16} />} label={t.totalApplications} value={career.length} />
                <Metric icon={<Mail size={16} />} label={t.responseRate} value={careerResponseRate(career)} />
                <Metric icon={<CalendarDays size={16} />} label={t.interviews} value={career.filter((item) => item.status === "interview").length} />
                <Metric icon={<Target size={16} />} label={t.applicationsWeek} value={applicationsThisWeek(career)} />
              </div>
              <form className="career-form" onSubmit={addCareerApplication}>
                <input value={careerForm.company} onChange={(event) => setCareerForm({ ...careerForm, company: event.target.value })} placeholder={t.company} />
                <input value={careerForm.role} onChange={(event) => setCareerForm({ ...careerForm, role: event.target.value })} placeholder={t.role} />
                <input type="date" value={careerForm.date} onChange={(event) => setCareerForm({ ...careerForm, date: event.target.value })} />
                <select value={careerForm.status} onChange={(event) => setCareerForm({ ...careerForm, status: event.target.value as JobStatus })}>
                  <option value="applied">applied</option>
                  <option value="screening">screening</option>
                  <option value="interview">interview</option>
                  <option value="offer">offer</option>
                  <option value="rejected">rejected</option>
                </select>
                <input value={careerForm.url} onChange={(event) => setCareerForm({ ...careerForm, url: event.target.value })} placeholder={t.url} />
                <input value={careerForm.recruiterName} onChange={(event) => setCareerForm({ ...careerForm, recruiterName: event.target.value })} placeholder={t.recruiter} />
                <input value={careerForm.salaryExpectation} onChange={(event) => setCareerForm({ ...careerForm, salaryExpectation: event.target.value })} placeholder={t.salary} />
                <input value={careerForm.nextActionReminder} onChange={(event) => setCareerForm({ ...careerForm, nextActionReminder: event.target.value })} placeholder={t.nextAction} />
                <textarea value={careerForm.notes} onChange={(event) => setCareerForm({ ...careerForm, notes: event.target.value })} placeholder={t.notes} />
                <button className="wide-button"><Plus size={17} />{t.addApplication}</button>
              </form>
              <div className="career-ai">
                <input value={careerPrompt} onChange={(event) => setCareerPrompt(event.target.value)} placeholder={t.careerAi} />
                <button onClick={() => askCareerAi(careerPrompt)}><Bot size={16} />{t.careerAi}</button>
                {careerAiReply && <p>{careerAiReply}</p>}
              </div>
              <div className="application-list">
                {career.slice(0, 8).map((item) => (
                  <article className="application-card" key={item.id}>
                    <strong>{item.company} · {item.role}</strong>
                    <span>{item.status} · {item.date}{item.synced === false ? " · offline" : ""}</span>
                    {item.nextActionReminder && <small>{item.nextActionReminder}</small>}
                    {item.url && <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a>}
                  </article>
                ))}
              </div>
            </Panel>

            <Panel icon={<MapPin size={17} />} title={t.activity} view="activity" activeView={activeView} {...panelProps("activity")}>
              <div className="activity-actions">
                <button onClick={addCurrentLocation}><MapPin size={16} />{t.gps}</button>
                <button onClick={addAppUsage}><Smartphone size={16} />{t.appUsage}</button>
                <button onClick={toggleNotifications}>
                  <Bell size={16} />
                  {notificationSettings.enabled ? t.disableNotifications : t.enableNotifications}
                </button>
              </div>
              <div className="activity-list">
                {activity.slice(0, 10).map((item) => (
                  <article className="activity-card" key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.type} · {new Date(item.occurredAt).toLocaleString()}</span>
                    {item.detail && <p>{item.detail}</p>}
                    {item.latitude && item.longitude && <small>{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</small>}
                  </article>
                ))}
              </div>
            </Panel>

            <Panel icon={<Brain size={17} />} title={t.memory} view="memory" activeView={activeView} {...panelProps("memory")}>
              <form className="inline-form" onSubmit={addMemory}>
                <input value={memoryInput} onChange={(event) => setMemoryInput(event.target.value)} placeholder={t.importantData} />
                <button title={t.saveMemory}><Plus size={17} /></button>
              </form>
              <div className="stack-list">
                {memory.slice(0, 6).map((item) => (
                  <div className="list-item" key={item.id}>
                    <p>{item.content}</p>
                    <button onClick={() => removeMemory(item.id)} title={t.delete}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel icon={<CheckCircle2 size={17} />} title={t.tasks} view="tasks" activeView={activeView} {...panelProps("tasks")}>
              <form className="task-form" onSubmit={addTask}>
                <input value={taskInput} onChange={(event) => setTaskInput(event.target.value)} placeholder={t.newTask} />
                <select value={taskPriority} onChange={(event) => setTaskPriority(event.target.value as TaskItem["priority"])}>
                  <option value="low">{t.low}</option>
                  <option value="medium">{t.medium}</option>
                  <option value="high">{t.high}</option>
                </select>
                <button title={t.createTask}><Plus size={17} /></button>
              </form>
              <div className="stack-list">
                {tasks.slice(0, 8).map((task) => (
                  <div className={`list-item task ${task.status}`} key={task.id}>
                    <button onClick={() => toggleTask(task)} title={t.changeStatus}>
                      {task.status === "done" ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </button>
                    <p>{task.title}</p>
                    <span className={`priority ${task.priority}`}>{t[task.priority]}</span>
                    <button onClick={() => removeTask(task.id)} title={t.delete}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel icon={<Globe2 size={17} />} title={t.internet} view="search" activeView={activeView} {...panelProps("search")}>
              <form className="inline-form" onSubmit={runSearch}>
                <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={t.searchWeb} />
                <button title={t.searchWeb}><Search size={17} /></button>
              </form>
              <div className="search-results">
                {searchResults.map((result) => (
                  <a href={result.url} target="_blank" rel="noreferrer" key={result.url}>
                    <strong>{result.title}</strong>
                    <span>{result.snippet || result.url}</span>
                  </a>
                ))}
              </div>
            </Panel>

            <Panel icon={<ImagePlus size={17} />} title={t.visionAI} view="vision" activeView={activeView} {...panelProps("vision")}>
              <form className="vision-form" onSubmit={analyzeVision}>
                <label className="file-picker">
                  <ImagePlus size={18} />
                  <span>{visionImage ? t.imageReady : t.uploadCapture}</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleVisionFile(event.target.files?.[0])} />
                </label>
                {visionImage && <img className="vision-preview" src={visionImage} alt="Preview" />}
                <textarea value={visionPrompt} onChange={(event) => setVisionPrompt(event.target.value)} rows={3} placeholder={t.visionPlaceholder} />
                <button className="wide-button" disabled={busy}>
                  {busy ? <Loader2 className="spin" size={17} /> : <Search size={17} />}
                  {t.analyze}
                </button>
              </form>
              <div className="vision-list">
                {vision.slice(0, 4).map((item) => (
                  <article className="vision-item" key={item.id}>
                    <div className="message-meta">
                      <span>{item.provider}</span>
                      <button onClick={() => removeVision(item.id)} title={t.delete}><Trash2 size={14} /></button>
                    </div>
                    <strong>{item.prompt}</strong>
                    <p>{item.analysis}</p>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel icon={<Target size={17} />} title={t.modules} view="modules" activeView={activeView} {...panelProps("modules")}>
              <div className="module-grid">
                {moduleCatalog.map((item) => {
                  const Icon = item.icon;
                  const enabled = activeModules.includes(item.id);
                  return (
                    <article className={`module-card ${enabled ? "enabled" : ""}`} key={item.id}>
                      <button className="module-main" onClick={() => toggleModule(item.id)}>
                        <Icon size={20} />
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.detail}</small>
                        </span>
                        <em>{enabled ? t.active : t.planned}</em>
                      </button>
                      <button className="module-action" onClick={() => addModuleTask(item.title)}>
                        <Plus size={15} />
                        {t.addAsTask}
                      </button>
                    </article>
                  );
                })}
              </div>
            </Panel>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Panel({
  icon,
  title,
  children,
  view,
  activeView,
  order,
  collapsed,
  expanded,
  labels,
  onMoveUp,
  onMoveDown,
  onToggleCollapse,
  onToggleExpand
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  view: ViewKey;
  activeView: ViewKey;
  order: number;
  collapsed: boolean;
  expanded: boolean;
  labels: { minimize: string; expand: string; moveUp: string; moveDown: string };
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleCollapse: () => void;
  onToggleExpand: () => void;
}) {
  return (
    <section className={`panel view-panel ${activeView === view ? "active-view" : ""} ${collapsed ? "collapsed" : ""} ${expanded ? "expanded" : ""}`} style={{ order }}>
      <div className="panel-title">
        <span className="panel-heading">
          {icon}
          <h2>{title}</h2>
        </span>
        <div className="panel-controls">
          <button onClick={onMoveUp} title={labels.moveUp}><ArrowUp size={14} /></button>
          <button onClick={onMoveDown} title={labels.moveDown}><ArrowDown size={14} /></button>
          <button onClick={onToggleCollapse} title={labels.minimize}>{collapsed ? <Maximize2 size={14} /> : <Minimize2 size={14} />}</button>
          <button onClick={onToggleExpand} title={labels.expand}>{expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
        </div>
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

function CustomChartCard({ chart, onDelete }: { chart: CustomChart; onDelete: () => void }) {
  const max = Math.max(...chart.values.map((value) => Math.abs(value)), 1);
  const total = chart.values.reduce((sum, value) => sum + Math.max(0, value), 0) || 1;
  const linePoints = chart.values.map((value, index) => {
    const x = chart.values.length === 1 ? 50 : (index / (chart.values.length - 1)) * 100;
    const y = 92 - (Math.max(0, value) / max) * 78;
    return `${x},${y}`;
  }).join(" ");
  const pieBackground = buildPieGradient(chart.values, total);

  return (
    <article className="custom-chart-card">
      <div className="custom-chart-head">
        <div>
          <strong>{chart.title}</strong>
          <small>{new Date(chart.createdAt).toLocaleString()}</small>
        </div>
        <button onClick={onDelete} title="Delete"><Trash2 size={15} /></button>
      </div>
      {chart.description && <p>{chart.description}</p>}
      {chart.kind === "bar" && (
        <div className="bar-chart">
          {chart.labels.map((label, index) => (
            <div className="bar-row" key={`${chart.id}-${label}-${index}`}>
              <span>{label}</span>
              <div><i style={{ width: `${Math.max(4, (Math.abs(chart.values[index]) / max) * 100)}%` }} /></div>
              <strong>{formatChartValue(chart.values[index], chart.unit)}</strong>
            </div>
          ))}
        </div>
      )}
      {chart.kind === "line" && (
        <div className="line-chart">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={chart.title}>
            <polyline points={linePoints} />
          </svg>
          <div>
            {chart.labels.map((label, index) => (
              <span key={`${chart.id}-line-${label}-${index}`}>{label}<b>{formatChartValue(chart.values[index], chart.unit)}</b></span>
            ))}
          </div>
        </div>
      )}
      {chart.kind === "pie" && (
        <div className="pie-chart-wrap">
          <div className="pie-chart" style={{ background: pieBackground }} />
          <div className="pie-legend">
            {chart.labels.map((label, index) => (
              <span key={`${chart.id}-pie-${label}-${index}`}><i style={{ background: chartColor(index) }} />{label}: {formatChartValue(chart.values[index], chart.unit)}</span>
            ))}
          </div>
        </div>
      )}
      {chart.kind === "table" && (
        <div className="data-table">
          {chart.labels.map((label, index) => (
            <div key={`${chart.id}-table-${label}-${index}`}>
              <span>{label}</span>
              <strong>{formatChartValue(chart.values[index], chart.unit)}</strong>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function buildPieGradient(values: number[], total: number) {
  let current = 0;
  const stops = values.map((value, index) => {
    const start = current;
    current += (Math.max(0, value) / total) * 100;
    return `${chartColor(index)} ${start}% ${current}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function chartColor(index: number) {
  const colors = ["#2dd4bf", "#6d5dfc", "#f59e0b", "#38bdf8", "#22c55e", "#fb7185", "#a78bfa", "#14b8a6"];
  return colors[index % colors.length];
}

function formatChartValue(value: number, unit?: string) {
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${formatted}${unit ? ` ${unit}` : ""}`;
}

function MessageActions({ message }: { message: Message }) {
  async function copyMessage() {
    await navigator.clipboard?.writeText(message.content);
  }

  return (
    <div className="message-actions">
      <button onClick={copyMessage} title="Copy"><Clipboard size={15} /></button>
      {message.role === "assistant" && <button title="Play"><Play size={15} /></button>}
      <button title="Like"><ThumbsUp size={15} /></button>
      <button title="Dislike"><ThumbsDown size={15} /></button>
      <button title="Retry"><RefreshCw size={15} /></button>
    </div>
  );
}

function actionLabel(status: ActionStatus, t: (typeof translations)["es"]) {
  if (status === "approved") return t.actionApproved;
  if (status === "done") return t.actionDone;
  if (status === "cancelled") return t.actionCancelled;
  return t.actionPending;
}

function careerResponseRate(applications: JobApplication[]) {
  if (applications.length === 0) return 0;
  const responses = applications.filter((item) => item.status !== "applied" && item.status !== "rejected").length;
  return Math.round((responses / applications.length) * 100);
}

function applicationsThisWeek(applications: JobApplication[]) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return applications.filter((item) => new Date(item.date).getTime() >= weekAgo).length;
}

function formatMoneyValue(value: string | number, prefix = "") {
  if (typeof value === "number") return `${prefix}${value.toLocaleString()}`;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${prefix}${parsed.toLocaleString()}` : value;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
