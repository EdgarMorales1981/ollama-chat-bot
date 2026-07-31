// api/ollama-proxy.js
// Función serverless de Vercel para comunicarse
// de forma segura con Ollama Cloud.

const OLLAMA_HOST = "https://ollama.com";

export default async function handler(req, res) {
    const apiKey = process.env.OLLAMA_API_KEY;

    if (!apiKey) {
        console.error(
            "OLLAMA_API_KEY no está configurada en Vercel."
        );

        return res.status(500).json({
            error:
                "OLLAMA_API_KEY no está configurada en el servidor.",
        });
    }

    if (req.method === "GET") {
        const action = req.query.action || "tags";

        const allowedActions = [
            "tags",
            "version",
        ];

        if (!allowedActions.includes(action)) {
            return res.status(400).json({
                error: "Acción GET no permitida.",
            });
        }

        try {
            const response = await fetch(
                `${OLLAMA_HOST}/api/${action}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        Accept: "application/json",
                    },
                }
            );

            const responseText =
                await response.text();

            if (!response.ok) {
                console.error(
                    "Error GET de Ollama:",
                    response.status,
                    responseText
                );

                return res.status(response.status).json({
                    error: `Ollama respondió con estado ${response.status}.`,
                    details: responseText,
                });
            }

            res.setHeader(
                "Content-Type",
                "application/json"
            );

            return res
                .status(response.status)
                .send(responseText);
        } catch (error) {
            console.error(
                "Error conectando con Ollama:",
                error
            );

            return res.status(500).json({
                error:
                    "No se pudo conectar con Ollama Cloud.",
                details: error.message,
            });
        }
    }

    if (req.method === "POST") {
        try {
            const requestBody = req.body || {};

            if (
                !Array.isArray(requestBody.messages) ||
                requestBody.messages.length === 0
            ) {
                return res.status(400).json({
                    error:
                        "Debes enviar un arreglo messages.",
                });
            }

            const payload = {
                ...requestBody,
                model:
                    requestBody.model ||
                    "nemotron-3-ultra:cloud",
                stream: requestBody.stream !== false,
            };

            const response = await fetch(
                `${OLLAMA_HOST}/api/chat`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`,
                        Accept: payload.stream
                            ? "application/x-ndjson"
                            : "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (!response.ok) {
                const errorText =
                    await response.text();

                console.error(
                    "Error POST de Ollama:",
                    response.status,
                    errorText
                );

                return res.status(response.status).json({
                    error: `Ollama respondió con estado ${response.status}.`,
                    details: errorText,
                });
            }

            if (payload.stream) {
                if (!response.body) {
                    return res.status(502).json({
                        error:
                            "Ollama no devolvió un stream.",
                    });
                }

                res.status(200);

                res.setHeader(
                    "Content-Type",
                    "application/x-ndjson"
                );

                res.setHeader(
                    "Cache-Control",
                    "no-cache, no-transform"
                );

                res.setHeader(
                    "X-Content-Type-Options",
                    "nosniff"
                );

                const reader =
                    response.body.getReader();

                while (true) {
                    const { done, value } =
                        await reader.read();

                    if (done) {
                        break;
                    }

                    res.write(Buffer.from(value));
                }

                return res.end();
            }

            const data = await response.json();

            return res.status(200).json(data);
        } catch (error) {
            console.error(
                "Error interno del proxy:",
                error
            );

            return res.status(500).json({
                error: "Error interno del proxy.",
                details: error.message,
            });
        }
    }

    res.setHeader("Allow", ["GET", "POST"]);

    return res.status(405).json({
        error: `Método ${req.method} no permitido.`,
    });
}
