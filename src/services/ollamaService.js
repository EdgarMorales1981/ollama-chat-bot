// =====================================================
// Servicio Ollama Cloud
//
// Desarrollo:
//   Usa el proxy configurado en vite.config.js:
//   /ollama-api
//
// Producción:
//   Usa la función serverless de Vercel:
//   /api/ollama-proxy
// =====================================================

const isDev = import.meta.env.DEV;

const OLLAMA_HOST = isDev
    ? "/ollama-api"
    : "/api/ollama-proxy";

const DEFAULT_CLOUD_MODEL =
    "nemotron-3-ultra:cloud";

// Modelo confirmado para Ollama Cloud.
// Los demás modelos se obtendrán dinámicamente
// mediante el endpoint /api/tags.
export const CLOUD_MODELS = [
    {
        name: DEFAULT_CLOUD_MODEL,
        size: "Cloud",
        desc: "NVIDIA Ultra - Razonamiento avanzado",
        tags: ["thinking", "tools", "cloud"],
    },
];

/**
 * Convierte el modelo antiguo al identificador Cloud correcto.
 */
function normalizeModelName(model) {
    const modelName =
        typeof model === "string"
            ? model
            : model?.name;

    if (!modelName) {
        return DEFAULT_CLOUD_MODEL;
    }

    if (modelName === "nemotron-3-ultra") {
        return DEFAULT_CLOUD_MODEL;
    }

    return modelName;
}

/**
 * Construye la URL correspondiente según el entorno.
 */
function getApiUrl(action) {
    if (isDev) {
        return `${OLLAMA_HOST}/api/${action}`;
    }

    if (action === "chat") {
        return OLLAMA_HOST;
    }

    return `${OLLAMA_HOST}?action=${encodeURIComponent(
        action
    )}`;
}

/**
 * Extrae el error real devuelto por el servidor.
 */
async function getResponseError(response) {
    const fallbackMessage =
        `Error HTTP ${response.status}`;

    try {
        const text = await response.text();

        if (!text) {
            return fallbackMessage;
        }

        try {
            const data = JSON.parse(text);

            return (
                data.details ||
                data.error ||
                fallbackMessage
            );
        } catch {
            return text;
        }
    } catch {
        return fallbackMessage;
    }
}

/**
 * Procesa una línea NDJSON recibida desde Ollama.
 */
function processStreamLine(
    line,
    onToken
) {
    const cleanLine = line.trim();

    if (!cleanLine) {
        return "";
    }

    let data;

    try {
        data = JSON.parse(cleanLine);
    } catch {
        console.warn(
            "Línea NDJSON inválida:",
            cleanLine
        );

        return "";
    }

    if (data.error) {
        throw new Error(data.error);
    }

    const token =
        data.message?.content || "";

    if (token) {
        onToken(token);
    }

    return token;
}

/**
 * Chat con respuesta por streaming.
 */
export async function streamChat(
    model,
    messages,
    onToken,
    signal
) {
    if (!Array.isArray(messages)) {
        throw new Error(
            "messages debe ser un arreglo."
        );
    }

    if (typeof onToken !== "function") {
        throw new Error(
            "onToken debe ser una función."
        );
    }

    const selectedModel =
        normalizeModelName(model);

    const response = await fetch(
        getApiUrl("chat"),
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/json",
                Accept:
                    "application/x-ndjson",
            },
            body: JSON.stringify({
                model: selectedModel,
                messages,
                stream: true,
            }),
            signal,
        }
    );

    if (!response.ok) {
        const errorMessage =
            await getResponseError(response);

        throw new Error(errorMessage);
    }

    if (!response.body) {
        throw new Error(
            "El servidor no devolvió contenido."
        );
    }

    const reader =
        response.body.getReader();

    const decoder =
        new TextDecoder("utf-8");

    let buffer = "";
    let fullMessage = "";

    while (true) {
        const { done, value } =
            await reader.read();

        if (done) {
            break;
        }

        buffer += decoder.decode(
            value,
            {
                stream: true,
            }
        );

        const lines =
            buffer.split("\n");

        buffer =
            lines.pop() || "";

        for (const line of lines) {
            const token =
                processStreamLine(
                    line,
                    onToken
                );

            fullMessage += token;
        }
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
        const token =
            processStreamLine(
                buffer,
                onToken
            );

        fullMessage += token;
    }

    return fullMessage;
}

/**
 * Obtiene los modelos disponibles.
 */
export async function getModels() {
    const response = await fetch(
        getApiUrl("tags"),
        {
            method: "GET",
            headers: {
                Accept:
                    "application/json",
            },
        }
    );

    if (!response.ok) {
        const errorMessage =
            await getResponseError(response);

        throw new Error(errorMessage);
    }

    const data =
        await response.json();

    if (!Array.isArray(data.models)) {
        return CLOUD_MODELS;
    }

    const models = data.models.map(
        (model) => ({
            ...model,
            name:
                normalizeModelName(
                    model.name
                ),
        })
    );

    return models.length > 0
        ? models
        : CLOUD_MODELS;
}

/**
 * Verifica la conexión con Ollama Cloud.
 *
 * Se utiliza /api/tags porque permite comprobar:
 * 1. Que la función serverless existe.
 * 2. Que la API key está configurada.
 * 3. Que Ollama acepta la autenticación.
 */
export async function checkOllamaStatus() {
    const response = await fetch(
        getApiUrl("tags"),
        {
            method: "GET",
            headers: {
                Accept:
                    "application/json",
            },
            cache: "no-store",
        }
    );

    if (!response.ok) {
        const errorMessage =
            await getResponseError(response);

        throw new Error(errorMessage);
    }

    const data =
        await response.json();

    return {
        connected: true,
        modelCount:
            Array.isArray(data.models)
                ? data.models.length
                : 0,
    };
}
