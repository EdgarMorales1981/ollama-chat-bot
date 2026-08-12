//const isDev = import.meta.env.DEV;
// const OLLAMA_HOST = isDev ? "/ollama-api" : "/api/ollama-proxy";
//
// export const MODEL = "glm-5.2";
//
// export async function streamChat(model, messages, onToken, signal) {
//   const url = isDev ? OLLAMA_HOST + "/api/chat" : OLLAMA_HOST;
//
//   const response = await fetch(url, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ model, messages, stream: true }),
//     signal,
//   });
//
//   if (!response.ok) {
//     let errMsg = "Error " + response.status;
//     try {
//       const e = await response.json();
//       errMsg = e.error || errMsg;
//     } catch {}
//     throw new Error(errMsg);
//   }
//
//   if (!response.body) throw new Error("Sin body");
//
//   const reader = response.body.getReader();
//   const decoder = new TextDecoder();
//   let full = "";
//   let buffer = "";
//
//   try {
//     while (true) {
//       const { done, value } = await reader.read();
//       if (done) break;
//       buffer += decoder.decode(value, { stream: true });
//       const lines = buffer.split("\n");
//       buffer = lines.pop() ?? "";
//       for (const line of lines) {
//         if (!line.trim()) continue;
//         try {
//           const json = JSON.parse(line);
//           if (json.message && json.message.content) {
//             full += json.message.content;
//             onToken(json.message.content);
//           }
//         } catch {}
//       }
//     }
//     if (buffer.trim()) {
//       try {
//         const json = JSON.parse(buffer);
//         if (json.message && json.message.content) {
//           full += json.message.content;
//           onToken(json.message.content);
//         }
//       } catch {}
//     }
//   } finally {
//     reader.cancel();
//   }
//   return full;
// }
//
// export async function checkOllamaStatus() {
//   try {
//     const url = isDev ? OLLAMA_HOST + "/api/version" : OLLAMA_HOST + "?action=version";
//     const response = await fetch(url);
//     if (response.ok) {
//       const data = await response.json();
//       return data.version || "cloud";
//     }
//     return false;
//   } catch {
//     return false;
//   }
// }
