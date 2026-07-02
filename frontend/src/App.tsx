import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bot,
  Brain,
  CheckCircle2,
  Circle,
  Globe2,
  ImagePlus,
  KeyRound,
  Loader2,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2
} from "lucide-react";
import { api } from "./services/api";
import type { MemoryItem, Message, ProviderName, SearchResult, TaskItem, VisionItem } from "./types";

export function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [vision, setVision] = useState<VisionItem[]>([]);
  const [integrations, setIntegrations] = useState<Record<string, { configured: boolean; label: string; fallback?: string; next?: boolean }>>({});
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [provider, setProvider] = useState<ProviderName>("auto");
  const [chatInput, setChatInput] = useState("");
  const [memoryInput, setMemoryInput] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskItem["priority"]>("medium");
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [visionPrompt, setVisionPrompt] = useState("Analiza esta captura y dime que ves, errores, texto importante y siguientes pasos.");
  const [visionImage, setVisionImage] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
  const doneTasks = tasks.filter((task) => task.status === "done");

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude enviar el mensaje");
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
      setError(err instanceof Error ? err.message : "No pude buscar");
    } finally {
      setBusy(false);
    }
  }

  async function analyzeVision(event: FormEvent) {
    event.preventDefault();
    if (!visionImage) {
      setError("Selecciona una imagen o captura primero.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const item = await api.analyzeVision(visionPrompt, visionImage, provider);
      setVision((current) => [item, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude analizar la imagen");
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

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Sparkles size={19} /></div>
          <div>
            <h1>Sentinel AI</h1>
            <p>Personal AI Operations Assistant</p>
          </div>
        </div>

        <section className="metric-grid">
          <Metric icon={<Brain size={18} />} label="Memorias" value={memory.length} />
          <Metric icon={<CheckCircle2 size={18} />} label="Abiertas" value={openTasks.length} />
          <Metric icon={<ImagePlus size={18} />} label="Vision" value={vision.length} />
        </section>

        <section className="panel integrations-panel">
          <div className="panel-title">
            <KeyRound size={17} />
            <h2>Integraciones</h2>
          </div>
          <div className="integration-list">
            {Object.entries(integrations).map(([key, item]) => (
              <div className="integration" key={key}>
                <span className={item.configured ? "dot ready" : "dot"} />
                <span>{item.label}</span>
                <small>{item.configured ? "lista" : item.next ? "siguiente fase" : item.fallback ? "fallback" : "pendiente"}</small>
              </div>
            ))}
          </div>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h2>Centro de mando personal</h2>
            <p>Chat, memoria, tareas y busqueda en una sola superficie.</p>
          </div>
          <label className="provider-select">
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
        </header>

        {error && <div className="error-banner">{error}</div>}

        <div className="main-grid">
          <section className="chat-panel">
            <div className="messages">
              {activeMessages.length === 0 && (
                <div className="empty-state">
                  <Bot size={32} />
                  <h3>Tu asistente esta listo</h3>
                  <p>Prueba: "Recuerda que mi meta es backend y ciberseguridad" o "Tarea: estudiar Docker manana".</p>
                </div>
              )}
              {activeMessages.map((message) => (
                <article className={`message ${message.role}`} key={message.id}>
                  <div className="message-meta">
                    <span>{message.role === "user" ? "Tu" : "Sentinel"}</span>
                    {message.provider && <small>{message.provider}</small>}
                  </div>
                  <p>{message.content}</p>
                </article>
              ))}
            </div>
            <form className="composer" onSubmit={sendMessage}>
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Escribe una instruccion, idea o pendiente..."
              />
              <button type="submit" disabled={busy} title="Enviar">
                {busy ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
              </button>
            </form>
          </section>

          <aside className="right-rail">
            <section className="panel">
              <div className="panel-title">
                <Brain size={17} />
                <h2>Memoria</h2>
              </div>
              <form className="inline-form" onSubmit={addMemory}>
                <input value={memoryInput} onChange={(event) => setMemoryInput(event.target.value)} placeholder="Dato importante" />
                <button title="Guardar memoria"><Plus size={17} /></button>
              </form>
              <div className="stack-list">
                {memory.slice(0, 6).map((item) => (
                  <div className="list-item" key={item.id}>
                    <p>{item.content}</p>
                    <button onClick={() => removeMemory(item.id)} title="Eliminar"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-title">
                <CheckCircle2 size={17} />
                <h2>Tareas</h2>
              </div>
              <form className="task-form" onSubmit={addTask}>
                <input value={taskInput} onChange={(event) => setTaskInput(event.target.value)} placeholder="Nueva tarea" />
                <select value={taskPriority} onChange={(event) => setTaskPriority(event.target.value as TaskItem["priority"])}>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
                <button title="Crear tarea"><Plus size={17} /></button>
              </form>
              <div className="stack-list">
                {tasks.slice(0, 7).map((task) => (
                  <div className={`list-item task ${task.status}`} key={task.id}>
                    <button onClick={() => toggleTask(task)} title="Cambiar estado">
                      {task.status === "done" ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </button>
                    <p>{task.title}</p>
                    <span className={`priority ${task.priority}`}>{task.priority}</span>
                    <button onClick={() => removeTask(task.id)} title="Eliminar"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-title">
                <Globe2 size={17} />
                <h2>Internet</h2>
              </div>
              <form className="inline-form" onSubmit={runSearch}>
                <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Buscar en la web" />
                <button title="Buscar"><Search size={17} /></button>
              </form>
              <div className="search-results">
                {searchResults.map((result) => (
                  <a href={result.url} target="_blank" rel="noreferrer" key={result.url}>
                    <strong>{result.title}</strong>
                    <span>{result.snippet || result.url}</span>
                  </a>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-title">
                <ImagePlus size={17} />
                <h2>Vision AI</h2>
              </div>
              <form className="vision-form" onSubmit={analyzeVision}>
                <label className="file-picker">
                  <ImagePlus size={18} />
                  <span>{visionImage ? "Imagen lista" : "Subir captura"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => handleVisionFile(event.target.files?.[0])}
                  />
                </label>
                {visionImage && <img className="vision-preview" src={visionImage} alt="Vista previa" />}
                <textarea
                  value={visionPrompt}
                  onChange={(event) => setVisionPrompt(event.target.value)}
                  rows={3}
                  placeholder="Que quieres que analice?"
                />
                <button className="wide-button" disabled={busy}>
                  {busy ? <Loader2 className="spin" size={17} /> : <Search size={17} />}
                  Analizar
                </button>
              </form>
              <div className="vision-list">
                {vision.slice(0, 4).map((item) => (
                  <article className="vision-item" key={item.id}>
                    <div className="message-meta">
                      <span>{item.provider}</span>
                      <button onClick={() => removeVision(item.id)} title="Eliminar"><Trash2 size={14} /></button>
                    </div>
                    <strong>{item.prompt}</strong>
                    <p>{item.analysis}</p>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
