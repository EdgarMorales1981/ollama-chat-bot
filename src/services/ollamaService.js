// =====================================================
// Servicio Ollama Cloud - funciona en dev (proxy Vite) y prod (Vercel)
// =====================================================

// En desarrollo: usa el proxy de Vite (/ollama-api)
// En producción: usa el serverless function de Vercel (/api/ollama-proxy)
const isDev = import.meta.env.DEV;
const OLLAMA_HOST = isDev ? "/ollama-api" : "/api/ollama-proxy";

export const CLOUD_MODELS = [
    { name: "nemotron-3-ultra", size: "—", desc: "NVIDIA Ultra - Razonamiento maximo", tags: ["thinking", "tools"] },
    { name: "nemotron-3-super", size: "215GB", desc: "NVIDIA Super - Alto rendimiento", tags: ["thinking", "tools"] },
    { name: "nemotron-3-nano:30b", size: "30GB", desc: "NVIDIA Nano - Rapido", tags: ["thinking", "tools"] },
    { name: "gpt-oss:120b", size: "61GB", desc: "GPT-OSS 120B - Avanzado", tags: ["thinking", "tools"] },
    { name: "gpt-oss:20b", size: "13GB", desc: "GPT-OSS 20B - Ligero", tags: ["thinking", "tools"] },
    { name: "kimi-k2.7-code", size: "554GB", desc: "Kimi K2.7 Code - Programacion", tags: ["vision", "thinking", "tools"] },
    { name: "kimi-k2.6", size: "554GB", desc: "Kimi K2.6 - Contexto largo", tags: ["vision", "thinking", "tools"] },
    { name: "glm-5.2", size: "—", desc: "GLM 5.2 - Ultima generacion", tags: ["thinking", "tools"] },
    { name: "glm-5.1", size: "1404GB", desc: "GLM 5.1 - Complejo", tags: ["thinking", "tools"] },
    { name: "minimax-m3", size: "—", desc: "MiniMax M3 - Multimodal", tags: ["vision", "thinking", "tools"] },
    { name: "minimax-m2.7", size: "448GB", desc: "MiniMax M2.7 - General", tags: ["thinking", "tools"] },
    { name: "deepseek-v4-pro", size: "1490GB", desc: "DeepSeek V4 Pro - Maxima calidad", tags: ["thinking", "tools"] },
    { name: "deepseek-v4-flash", size: "130GB", desc: "DeepSeek V4 Flash - Rapido", tags: ["thinking", "tools"] },
    { name: "qwen3.5:397b", size: "370GB", desc: "Qwen 3.5 - Multimodal", tags: ["vision", "thinking", "tools"] },
    { name: "gemma4:31b", size: "58GB", desc: "Gemma 4 31B - Ligero", tags: ["vision", "thinking", "tools"] },
    { name: "mistral-large-3:675b", size: "635GB", desc: "Mistral Large 3 - Pesado", tags: ["vision", "tools"] },
];

export async function streamChat(model, messages, onToken, signal) {
    const response = await fetch(OLLAMA_HOST + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, stream: true }),
        signal,
    });

    if (!response.ok) {
        let errMsg = "Error " + response.status;
        try {
            const errData = await response.json();
            errMsg = errData.error || errMsg;
        } catch {}
        throw new Error(errMsg);
    }

    if (!response.body) throw new Error("No se recibio body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullMessage = "";
    let buffer = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const json = JSON.parse(line);
                    if (json.message && json.message.content) {
                        fullMessage += json.message.content;
                        onToken(json.message.content);
                    }
                } catch {}
            }
        }

        if (buffer.trim()) {
            try {
                const json = JSON.parse(buffer);
                if (json.message && json.message.content) {
                    fullMessage += json.message.content;
                    onToken(json.message.content);
                }
            } catch {}
        }
    } finally {
        reader.cancel();
    }

    return fullMessage;
}

export async function getModels() {
    try {
        const response = await fetch(OLLAMA_HOST + "/tags");
        if (!response.ok) return [];
        const data = await response.json();
        return data.models || [];
    } catch {
        return [];
    }
}

export async function checkOllamaStatus() {
    try {
        const response = await fetch(OLLAMA_HOST + "/version");
        if (response.ok) {
            const data = await response.json();
            return data.version || "cloud";
        }
        return false;
    } catch {
        return false;
    }
}
