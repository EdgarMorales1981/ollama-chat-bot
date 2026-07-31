import {
    useState,
    useRef,
    useEffect,
    useCallback,
} from "react";

import {
    streamChat,
    getModels,
    checkOllamaStatus,
    CLOUD_MODELS,
} from "./services/ollamaService";

import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import Sidebar from "./components/Sidebar";
import "./App.css";

const DEFAULT_MODEL = "nemotron-3-ultra:cloud";

function App() {
    const [messages, setMessages] = useState([]);
    const [isStreaming, setIsStreaming] = useState(false);

    const [selectedModel, setSelectedModel] =
        useState(DEFAULT_MODEL);

    const [availableModels, setAvailableModels] =
        useState([]);

    const [ollamaStatus, setOllamaStatus] =
        useState("checking");

    const [connectionError, setConnectionError] =
        useState("");

    const [systemPrompt, setSystemPrompt] = useState(
        "Eres un asistente de consultas útil. Responde de manera clara, precisa y concisa. Si no sabes algo, dilo claramente."
    );

    const abortControllerRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const initializeOllama = async () => {
            try {
                setOllamaStatus("checking");
                setConnectionError("");

                const status = await checkOllamaStatus();

                if (!status) {
                    throw new Error(
                        "El proxy no devolvió una respuesta válida."
                    );
                }

                setOllamaStatus("connected");

                try {
                    const models = await getModels();

                    if (Array.isArray(models) && models.length > 0) {
                        setAvailableModels(models);
                    } else {
                        setAvailableModels(CLOUD_MODELS);
                    }
                } catch (modelsError) {
                    console.error(
                        "Error cargando modelos:",
                        modelsError
                    );

                    setAvailableModels(CLOUD_MODELS);
                }
            } catch (error) {
                console.error(
                    "Error conectando con Ollama:",
                    error
                );

                setOllamaStatus("error");

                setConnectionError(
                    error?.message ||
                    "No se pudo conectar con Ollama Cloud."
                );

                setAvailableModels(CLOUD_MODELS);
            }
        };

        initializeOllama();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages]);

    const handleSend = useCallback(
        async (userText) => {
            const cleanText = userText.trim();

            if (!cleanText || isStreaming) {
                return;
            }

            const fullMessages = [
                {
                    role: "system",
                    content: systemPrompt,
                },
                ...messages.map((message) => ({
                    role: message.role,
                    content: message.content,
                })),
                {
                    role: "user",
                    content: cleanText,
                },
            ];

            const userId = Date.now();
            const assistantId = userId + 1;

            setMessages((previousMessages) => [
                ...previousMessages,
                {
                    role: "user",
                    content: cleanText,
                    id: userId,
                },
                {
                    role: "assistant",
                    content: "",
                    id: assistantId,
                    isStreaming: true,
                },
            ]);

            setIsStreaming(true);

            abortControllerRef.current =
                new AbortController();

            try {
                await streamChat(
                    selectedModel,
                    fullMessages,
                    (token) => {
                        setMessages((previousMessages) =>
                            previousMessages.map((message) =>
                                message.id === assistantId
                                    ? {
                                        ...message,
                                        content:
                                            message.content + token,
                                    }
                                    : message
                            )
                        );
                    },
                    abortControllerRef.current.signal
                );

                setMessages((previousMessages) =>
                    previousMessages.map((message) =>
                        message.id === assistantId
                            ? {
                                ...message,
                                isStreaming: false,
                            }
                            : message
                    )
                );
            } catch (error) {
                if (error.name === "AbortError") {
                    setMessages((previousMessages) =>
                        previousMessages.map((message) =>
                            message.id === assistantId
                                ? {
                                    ...message,
                                    isStreaming: false,
                                    content:
                                        message.content +
                                        "\n\n_⏹ Respuesta cancelada_",
                                }
                                : message
                        )
                    );
                } else {
                    console.error(
                        "Error enviando consulta:",
                        error
                    );

                    setMessages((previousMessages) =>
                        previousMessages.map((message) =>
                            message.id === assistantId
                                ? {
                                    ...message,
                                    isStreaming: false,
                                    content: `❌ **Error:** ${
                                        error?.message ||
                                        "No se pudo generar la respuesta."
                                    }`,
                                }
                                : message
                        )
                    );
                }
            } finally {
                setIsStreaming(false);
                abortControllerRef.current = null;
            }
        },
        [
            messages,
            isStreaming,
            selectedModel,
            systemPrompt,
        ]
    );

    const handleStop = () => {
        abortControllerRef.current?.abort();
    };

    const handleClear = () => {
        if (isStreaming) {
            handleStop();
        }

        setMessages([]);
    };

    return (
        <div className="app-container">
            <Sidebar
                models={availableModels}
                cloudModels={CLOUD_MODELS}
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                ollamaStatus={
                    ollamaStatus === "connected"
                }
                systemPrompt={systemPrompt}
                onSystemPromptChange={setSystemPrompt}
                onClear={handleClear}
            />

            <main className="chat-main">
                <header className="chat-header">
                    <h1>🤖 Bot de Consultas Cloud</h1>

                    <div className="header-info">
            <span className="model-badge">
              ☁️ {selectedModel}
            </span>

                        {ollamaStatus === "connected" && (
                            <span className="plan-badge">
                Cloud conectado
              </span>
                        )}
                    </div>
                </header>

                <div className="messages-container">
                    {messages.length === 0 ? (
                        <div className="welcome">
                            <h2>
                                ☁️ Bot de Consultas — Ollama
                                Cloud
                            </h2>

                            <p>
                                Usando el modelo{" "}
                                <strong>{selectedModel}</strong>
                            </p>

                            {ollamaStatus === "checking" && (
                                <p>
                                    ⏳ Comprobando conexión con
                                    Ollama Cloud...
                                </p>
                            )}

                            {ollamaStatus === "connected" && (
                                <p className="status-ok">
                                    ✅ Ollama Cloud API conectada
                                </p>
                            )}

                            {ollamaStatus === "error" && (
                                <div className="status-err">
                                    <p>
                                        ❌ No se pudo conectar con
                                        Ollama Cloud.
                                    </p>

                                    {connectionError && (
                                        <small>
                                            Error: {connectionError}
                                        </small>
                                    )}
                                </div>
                            )}

                            <div className="welcome-tips">
                                <p>
                                    💡 Escribe tu consulta abajo para
                                    empezar
                                </p>

                                <p>
                                    🔄 Puedes cambiar el modelo desde
                                    el panel izquierdo
                                </p>

                                <p>
                                    ⏹ Puedes detener la respuesta en
                                    cualquier momento
                                </p>
                            </div>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <ChatMessage
                                key={message.id}
                                message={message}
                            />
                        ))
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <ChatInput
                    onSend={handleSend}
                    onStop={handleStop}
                    isStreaming={isStreaming}
                />
            </main>
        </div>
    );
}

export default App;
