import { CLOUD_MODELS } from "../services/ollamaService";

function Sidebar({
                     selectedModel,
                     onSelectModel,
                     ollamaStatus,
                     systemPrompt,
                     onSystemPromptChange,
                     onClear,
                     isOpen,
                 }) {
    const allModels = CLOUD_MODELS;

    const categories = {
        "NVIDIA Nemotron": allModels.filter((m) => m.name.includes("nemotron")),
        "GPT-OSS": allModels.filter((m) => m.name.includes("gpt-oss")),
        Kimi: allModels.filter((m) => m.name.includes("kimi")),
        GLM: allModels.filter((m) => m.name.includes("glm")),
        MiniMax: allModels.filter((m) => m.name.includes("minimax")),
        DeepSeek: allModels.filter((m) => m.name.includes("deepseek")),
        Qwen: allModels.filter((m) => m.name.includes("qwen")),
        Gemma: allModels.filter((m) => m.name.includes("gemma")),
        Mistral: allModels.filter((m) => m.name.includes("mistral")),
    };

    const currentModel = allModels.find((m) => m.name === selectedModel);

    return (
        <aside className={"sidebar" + (isOpen ? " open" : "")}>
            <div className="sidebar-header">
                <h2>⚙️ Configuración</h2>
                <span className="mode-badge cloud">☁️ Cloud Pro</span>
            </div>

            <div className="sidebar-section">
                <label>Estado</label>
                <div className={ollamaStatus ? "status-pill online" : "status-pill offline"}>
                    {ollamaStatus ? "🟢 Cloud conectado" : "🔴 Desconectado"}
                </div>
            </div>

            <div className="sidebar-section">
                <label htmlFor="model-select">Modelo Cloud</label>
                <select id="model-select" value={selectedModel} onChange={(e) => onSelectModel(e.target.value)}>
                    {Object.entries(categories).map(([catName, catModels]) =>
                        catModels.length > 0 ? (
                            <optgroup key={catName} label={catName}>
                                {catModels.map((m) => (
                                    <option key={m.name} value={m.name}>
                                        {m.name} — {m.desc}
                                    </option>
                                ))}
                            </optgroup>
                        ) : null
                    )}
                </select>
                {currentModel && currentModel.tags && (
                    <div className="model-tags">
                        {currentModel.tags.map((tag) => (
                            <span key={tag} className="tag-chip">{tag}</span>
                        ))}
                    </div>
                )}
            </div>

            <div className="sidebar-section">
                <label htmlFor="system-prompt">Instrucciones del bot</label>
                <textarea
                    id="system-prompt"
                    value={systemPrompt}
                    onChange={(e) => onSystemPromptChange(e.target.value)}
                    rows={5}
                    placeholder="Ej: Eres un asistente que responde preguntas..."
                />
            </div>

            <div className="sidebar-section">
                <button className="btn-clear" onClick={onClear}>🗑 Limpiar chat</button>
            </div>

            <div className="plan-info">
                <div className="plan-card">
                    <h3>☁️ Plan Pro</h3>
                    <ul>
                        <li>✓ 3 modelos simultáneos</li>
                        <li>✓ 50x uso Free</li>
                        <li>✓ Reset cada 5h / 7d</li>
                    </ul>
                </div>
            </div>

            <div className="sidebar-footer">
                <p>Ollama Cloud API</p>
            </div>
        </aside>
    );
}

export default Sidebar;
