import BotAvatar from "./BotAvatar";

export default function TypingIndicator() {
  return (
    <div className="chat-bubble-row chat-bubble-row--bot">
      <BotAvatar />
      <div className="chat-typing" aria-hidden>
        <span className="chat-typing__dot" />
        <span className="chat-typing__dot" />
        <span className="chat-typing__dot" />
      </div>
    </div>
  );
}
