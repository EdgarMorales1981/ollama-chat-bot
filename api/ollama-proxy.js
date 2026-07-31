// api/ollama-proxy.js
// Serverless function para Vercel - proxy a Ollama Cloud API

const OLLAMA_HOST = "https://ollama.com";

export default async function handler(req, res) {
    if (req.method !== "POST" && req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.OLLAMA_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "OLLAMA_API_KEY no configurada en Vercel" });
    }

    // Extraer el path después de /api/ollama-proxy
    let path = req.url || "";
    path = path.replace("/api/ollama-proxy", "");
    const endpoint = OLLAMA_HOST + "/api" + path;

    try {
        const response = await fetch(endpoint, {
            method: req.method,
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + apiKey,
            },
            body: req.method === "POST" ? JSON.stringify(req.body) : undefined,
        });

        const contentType = response.headers.get("content-type") || "application/json";

        // Streaming (ndjson o chunked)
        if (contentType.includes("ndjson") || response.headers.get("transfer-encoding") === "chunked") {
            res.setHeader("Content-Type", "application/x-ndjson");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(decoder.decode(value, { stream: true }));
            }
            res.end();
        } else {
            // Respuesta normal
            res.setHeader("Content-Type", contentType);
            const data = await response.text();
            res.status(response.status).send(data);
        }
    } catch (err) {
        console.error("Proxy error:", err);
        res.status(500).json({ error: err.message });
    }
}
