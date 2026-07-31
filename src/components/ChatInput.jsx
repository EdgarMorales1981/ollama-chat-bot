import { useState, useRef } from "react";
import "../App.css";

function ChatInput({ onSend, onStop, isStreaming }) {
    const [input, setInput] = useState("");
    const textareaRef = useRef(null);

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (!input.trim() || isStreaming) return;
        onSend(input);
        setInput("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleInput = (e) => {
        setInput(e.target.value);
        // Auto-resize del textarea
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
    };

    return (
        <div className="chat-input-container">
            <form onSubmit={handleSubmit} className="chat-input-form">
        <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu consulta... (Enter para enviar, Shift+Enter para nueva línea)"
            rows={1}
            disabled={isStreaming}
        />
                {isStreaming ? (
                    <button type="button" onClick={onStop} className="btn-stop">
                        ⏹ Detener
                    </button>
                ) : (
                    <button type="submit" className="btn-send" disabled={!input.trim()}>
                        ➤ Enviar
                    </button>
                )}
            </form>
        </div>
    );
}

export default ChatInput;
