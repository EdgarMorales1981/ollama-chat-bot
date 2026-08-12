const OLLAMA_HOST = "https://ollama.com";

export default async function handler(req, res) {
    const apiKey = process.env.OLLAMA_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "API key no configurada" });
    }

    if (req.method === "GET") {
        const action = req.query.action || "version";
        try {
            const response = await fetch(OLLAMA_HOST + "/api/" + action, {
                headers: { Authorization: "Bearer " + apiKey },
            });
            const data = await response.text();
            res.setHeader("Content-Type", "application/json");
            res.status(response.status).send(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
        return;
    }

    if (req.method === "POST") {
        try {
            const response = await fetch(OLLAMA_HOST + "/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + apiKey,
                },
                body: JSON.stringify(req.body),
            });

            if (req.body && req.body.stream !== false) {
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
                const data = await response.text();
                res.setHeader("Content-Type", "application/json");
                res.status(response.status).send(data);
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
        return;
    }

    res.status(405).json({ error: "Method not allowed" });
}
