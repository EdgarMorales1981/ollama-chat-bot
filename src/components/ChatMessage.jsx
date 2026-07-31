import "../App.css";

function ChatMessage({ message }) {
    const isUser = message.role === "user";

    return (
        <div className={`message ${isUser ? "message-user" : "message-assistant"}`}>
            <div className="message-avatar">
                {isUser ? "👤" : "🤖"}
            </div>
            <div className="message-body">
                <div className="message-role">
                    {isUser ? "Tú" : "Asistente"}
                </div>
                <div className="message-content">
                    {message.content}
                    {message.isStreaming && <span className="typing-indicator">▊</span>}
                </div>
            </div>
        </div>
    );
}

export default ChatMessage;
