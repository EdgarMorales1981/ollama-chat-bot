// api/ollama-proxy.js
// Serverless function para Vercel que hace de proxy a la API de Ollama Cloud
// Esto oculta la API key del navegador en producción

const OLLAMA_HOST = "https://ollama.com";

export default async function handler(req, res) {
    // Solo permitir POST
    if (req.method !== "POST" && req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.OLLAMA_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "OLLAMA_API_KEY no configurada" });
    }

    // Determinar el endpoint
    const path = req.url?.replace("/api/ollama-proxy", "") || "";
    const endpoint = `${OLLAMA_HOST}/api${path}`;

    try {
        const response = await fetch(endpoint, {
            method: req.method,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: req.method === "POST" ? JSON.stringify(req.body) : undefined,
        });

        // Si la respuesta es streaming, pipearlo
        if (response.headers.get("content-type")?.includes("ndjson") ||
            response.headers.get("transfer-encoding") === "chunked") {
            res.setHeader("Content-Type", "application/x-ndjson");
            res.setHeader("Cache-Control", "no-cache");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(decoder.decode(value, { stream: true }));
            }
            res.end();
        } else {
            // Respuesta normal (no streaming)
            const contentType = response.headers.get("content-type") || "application/json";
            res.setHeader("Content-Type", contentType);
            const data = await response.text();
            res.status(response.status).send(data);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
