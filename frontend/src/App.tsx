import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Bot,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Circle,
  Crosshair,
  Eye,
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
  Menu,
  Mic,
  Moon,
  Plus,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Smartphone,
  Sun,
  Target,
  Trash2,
  WalletCards,
  X
} from "lucide-react";
import { api } from "./services/api";
import type { MemoryItem, Message, ProviderName, SearchResult, TaskItem, VisionItem } from "./types";

type Language = "es" | "en" | "pt" | "fr";
type Theme = "light" | "dark";
type ViewKey = "chat" | "tasks" | "memory" | "vision" | "search" | "modules";

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
    memories: "Memorias",
    openTasks: "Abiertas",
    vision: "Vision",
    integrations: "Integraciones",
    ready: "lista",
    next: "siguiente fase",
    fallback: "fallback",
    pending: "pendiente",
    modules: "Modulos",
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
    memories: "Memories",
    openTasks: "Open",
    vision: "Vision",
    integrations: "Integrations",
    ready: "ready",
    next: "next phase",
    fallback: "fallback",
    pending: "pending",
    modules: "Modules",
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
    memories: "Memorias",
    openTasks: "Abertas",
    vision: "Visao",
    integrations: "Integracoes",
    ready: "pronta",
    next: "proxima fase",
    fallback: "fallback",
    pending: "pendente",
    modules: "Modulos",
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
    memories: "Memoires",
    openTasks: "Ouvertes",
    vision: "Vision",
    integrations: "Integrations",
    ready: "prete",
    next: "phase suivante",
    fallback: "fallback",
    pending: "en attente",
    modules: "Modules",
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
  const [integrations, setIntegrations] = useState<Record<string, { configured: boolean; label: string; fallback?: string; next?: boolean }>>({});
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [provider, setProvider] = useState<ProviderName>("auto");
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("sentinel-language") as Language) || "es");
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("sentinel-theme") as Theme) || "light");
  const [activeView, setActiveView] = useState<ViewKey>("chat");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeModules, setActiveModules] = useState<string[]>(() => JSON.parse(localStorage.getItem("sentinel-modules") || "[]"));
  const [chatInput, setChatInput] = useState("");
  const [memoryInput, setMemoryInput] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskItem["priority"]>("medium");
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
    api.bootstrap()
      .then((data) => {
        setMessages(data.messages);
        setMemory(data.memory);
        setTasks(data.tasks);
        setVision(data.vision);
        setIntegrations(data.integrations);
        const latest = data.messages.at(-1);
        if (latest) setConversationId(latest.conversationId);
      })
      .catch((err) => setError(err.message));
  }, []);

  const activeMessages = useMemo(
    () => messages.filter((message) => !conversationId || message.conversationId === conversationId),
    [messages, conversationId]
  );

  const openTasks = tasks.filter((task) => task.status === "open");
  const navItems: { key: ViewKey; label: string; icon: ReactNode }[] = [
    { key: "chat", label: t.chat, icon: <Bot size={17} /> },
    { key: "tasks", label: t.tasks, icon: <CheckCircle2 size={17} /> },
    { key: "memory", label: t.memory, icon: <Brain size={17} /> },
    { key: "vision", label: t.visionAI, icon: <ImagePlus size={17} /> },
    { key: "search", label: t.internet, icon: <Globe2 size={17} /> },
    { key: "modules", label: t.modules, icon: <Target size={17} /> }
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
      setActiveView("chat");
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

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "open" : ""}`}>
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

        <nav className="nav-list">
          {navItems.map((item) => (
            <button className={activeView === item.key ? "active" : ""} key={item.key} onClick={() => switchView(item.key)}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <section className="metric-grid">
          <Metric icon={<Brain size={18} />} label={t.memories} value={memory.length} />
          <Metric icon={<CheckCircle2 size={18} />} label={t.openTasks} value={openTasks.length} />
          <Metric icon={<ImagePlus size={18} />} label={t.vision} value={vision.length} />
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
            <label className="control-select" title={t.language}>
              <Languages size={17} />
              <select value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
                <option value="es">ES</option>
                <option value="en">EN</option>
                <option value="pt">PT</option>
                <option value="fr">FR</option>
              </select>
            </label>
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
                </article>
              ))}
            </div>
            <form className="composer" onSubmit={sendMessage}>
              <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder={t.chatPlaceholder} />
              <button type="submit" disabled={busy} title={t.send}>
                {busy ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
              </button>
            </form>
          </section>

          <aside className="right-rail">
            <Panel icon={<Brain size={17} />} title={t.memory} view="memory" activeView={activeView}>
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

            <Panel icon={<CheckCircle2 size={17} />} title={t.tasks} view="tasks" activeView={activeView}>
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

            <Panel icon={<Globe2 size={17} />} title={t.internet} view="search" activeView={activeView}>
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

            <Panel icon={<ImagePlus size={17} />} title={t.visionAI} view="vision" activeView={activeView}>
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

            <Panel icon={<Target size={17} />} title={t.modules} view="modules" activeView={activeView}>
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

function Panel({ icon, title, children, view, activeView }: { icon: ReactNode; title: string; children: ReactNode; view: ViewKey; activeView: ViewKey }) {
  return (
    <section className={`panel view-panel ${activeView === view ? "active-view" : ""}`}>
      <div className="panel-title">
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
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
