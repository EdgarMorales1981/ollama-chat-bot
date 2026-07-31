import { useState, useRef, useEffect, useCallback } from "react";
import { streamChat, getModels, checkOllamaStatus, CLOUD_MODELS } from "./services/ollamaService";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import Sidebar from "./components/Sidebar";
import "./App.css";

// Modelo por defecto — puedes cambiarlo
const DEFAULT_MODEL = "nemotron-3-ultra";

function App() {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [availableModels, setAvailableModels] = useState([]);
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [systemPrompt, setSystemPrompt] = useState(
      "Eres un asistente de consultas útil. Responde de manera clara, precisa y concisa. Si no sabes algo, dilo claramente."
  );
  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    checkOllamaStatus().then((version) => {
      setOllamaStatus(version);
      if (version) {
        getModels().then((models) => {
          setAvailableModels(models);
        });
      }
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
      async (userText) => {
        if (!userText.trim() || isStreaming) return;

        const fullMessages = [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: userText },
        ];

        setMessages((prev) => [...prev, { role: "user", content: userText, id: Date.now() }]);

        const assistantId = Date.now() + 1;
        setMessages((prev) => [...prev, { role: "assistant", content: "", id: assistantId, isStreaming: true }]);

        setIsStreaming(true);
        abortControllerRef.current = new AbortController();

        try {
          await streamChat(
              selectedModel,
              fullMessages,
              (token) => {
                setMessages((prev) =>
                    prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + token } : m))
                );
              },
              abortControllerRef.current.signal
          );

          setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
          );
        } catch (err) {
          if (err.name === "AbortError") {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantId
                        ? { ...m, isStreaming: false, content: m.content + "\n\n_⏹ Respuesta cancelada_" }
                        : m
                )
            );
          } else {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantId
                        ? { ...m, isStreaming: false, content: `❌ **Error:** ${err.message}` }
                        : m
                )
            );
          }
        } finally {
          setIsStreaming(false);
          abortControllerRef.current = null;
        }
      },
      [messages, isStreaming, selectedModel, systemPrompt]
  );

  const handleStop = () => abortControllerRef.current?.abort();
  const handleClear = () => {
    if (isStreaming) handleStop();
    setMessages([]);
  };

  return (
      <div className="app-container">
        <Sidebar
            models={availableModels}
            cloudModels={CLOUD_MODELS}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            ollamaStatus={ollamaStatus}
            systemPrompt={systemPrompt}
            onSystemPromptChange={setSystemPrompt}
            onClear={handleClear}
        />

        <main className="chat-main">
          <header className="chat-header">
            <h1>🤖 Bot de Consultas Cloud</h1>
            <div className="header-info">
              <span className="model-badge">☁️ {selectedModel}</span>
              {ollamaStatus && <span className="plan-badge">Pro Plan</span>}
            </div>
          </header>

          <div className="messages-container">
            {messages.length === 0 ? (
                <div className="welcome">
                  <h2>☁️ Bot de Consultas — Ollama Cloud</h2>
                  <p>Usando el modelo <strong>{selectedModel}</strong></p>
                  {ollamaStatus ? (
                      <p className="status-ok">✅ Cloud API conectada — Plan Pro activo</p>
                  ) : (
                      <p className="status-err">❌ No se pudo conectar. Revisa tu API key en <code>.env</code></p>
                  )}
                  <div className="welcome-tips">
                    <p>💡 Escribe tu consulta abajo para empezar</p>
                    <p>🔄 Puedes cambiar el modelo desde el panel izquierdo</p>
                    <p>⏹ Puedes detener la respuesta en cualquier momento</p>
                  </div>
                </div>
            ) : (
                messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
            )}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput onSend={handleSend} onStop={handleStop} isStreaming={isStreaming} />
        </main>
      </div>
  );
}

export default App;
