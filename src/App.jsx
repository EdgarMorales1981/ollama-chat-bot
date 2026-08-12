import { useState, useRef, useEffect, useCallback } from "react";
import { streamChat, checkOllamaStatus, MODEL } from "./services/ollamaService";

function App() {
    const [messages, setMessages] = useState([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [ollamaStatus, setOllamaStatus] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState(
        "Eres un asistente experto en análisis. Responde de manera clara, detallada y precisa."
    );
    const abortControllerRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        checkOllamaStatus().then(setOllamaStatus);
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
                    MODEL,
                    fullMessages,
                    (token) => {
                        setMessages((prev) =>
                            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + token } : m))
                        );
                    },
                    abortControllerRef.current.signal
                );
                setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)));
            } catch (err) {
                if (err.name === "AbortError") {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId ? { ...m, isStreaming: false, content: m.content + "\n\n_⏹ Cancelado_" } : m
                        )
                    );
                } else {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId ? { ...m, isStreaming: false, content: "❌ Error: " + err.message } : m
                        )
                    );
                }
            } finally {
                setIsStreaming(false);
                abortControllerRef.current = null;
            }
        },
        [messages, isStreaming, systemPrompt]
    );

    const handleStop = () => abortControllerRef.current?.abort();
    const handleClear = () => {
        if (isStreaming) handleStop();
        setMessages([]);
    };

    return (
        <div className="app-container">
            <div
                className={"sidebar-overlay" + (sidebarOpen ? " show" : "")}
                onClick={() => setSidebarOpen(false)}
            />

            {/* SIDEBAR */}
            <aside className={"sidebar" + (sidebarOpen ? " open" : "")}>
                <div className="sidebar-header">
                    <h2>⚙️ Configuración</h2>
                </div>

                <div className="model-info-box">
                    <h3>🧠 Modelo: GLM-5.2</h3>
                    <p>Mejor modelo de análisis disponible — Inteligencia Index: 50.7 / Contexto: 976K tokens</p>
                </div>

                <div className="sidebar-section">
                    <label>Estado</label>
                    <div className={ollamaStatus ? "status-pill online" : "status-pill offline"}>
                        {ollamaStatus ? "🟢 Cloud conectado" : "🔴 Desconectado"}
                    </div>
                </div>

                <div className="sidebar-section">
                    <label htmlFor="system-prompt">Instrucciones del bot</label>
                    <textarea
                        id="system-prompt"
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        rows={5}
                    />
                </div>

                <div className="sidebar-section">
                    <button className="btn-clear" onClick={handleClear}>🗑 Limpiar chat</button>
                </div>

                <div className="sidebar-footer">
                    <p>Ollama Cloud — Plan Pro</p>
                </div>
            </aside>

            {/* CHAT */}
            <main className="chat-main">
                <header className="chat-header">
                    <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
                    <h1>🤖 Bot de Análisis</h1>
                    <span className="badge">GLM-5.2</span>
                </header>

                <div className="messages-container">
                    {messages.length === 0 ? (
                        <div className="welcome">
                            <h2>🤖 Bot de Análisis — GLM-5.2</h2>
                            <p>El modelo más inteligente de Ollama Cloud</p>
                            {ollamaStatus ? (
                                <p className="status-ok">✅ Cloud conectado — Listo para consultar</p>
                            ) : (
                                <p className="status-err">❌ No se pudo conectar. Verifica la variable OLLAMA_API_KEY en Vercel</p>
                            )}
                            <div className="welcome-tips">
                                <p>💡 Escribe tu consulta abajo</p>
                                <p>📊 El análisis se genera en tiempo real</p>
                                <p>⏹ Detén cuando quieras</p>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} className={msg.role === "user" ? "message message-user" : "message message-assistant"}>
                                <div className="message-avatar">{msg.role === "user" ? "👤" : "🤖"}</div>
                                <div className="message-body">
                                    <div className="message-role">{msg.role === "user" ? "Tú" : "Asistente"}</div>
                                    <div className="message-content">
                                        {msg.content}
                                        {msg.isStreaming && <span className="typing-indicator">▊</span>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* INPUT */}
                <div className="chat-input-container">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!isStreaming) {
                                const input = e.target.querySelector("textarea");
                                if (input && input.value.trim()) {
                                    handleSend(input.value);
                                    input.value = "";
                                    input.style.height = "auto";
                                }
                            }
                        }}
                        className="chat-input-form"
                    >
            <textarea
                placeholder="Escribe tu consulta..."
                rows={1}
                disabled={isStreaming}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        e.target.form.requestSubmit();
                    }
                }}
                onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
            />
                        {isStreaming ? (
                            <button type="button" className="btn-stop" onClick={handleStop}>⏹ Detener</button>
                        ) : (
                            <button type="submit" className="btn-send">➤ Enviar</button>
                        )}
                    </form>
                </div>
            </main>
        </div>
    );
}

export default App;
