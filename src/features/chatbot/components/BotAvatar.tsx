type BotAvatarProps = {
  size?: "sm" | "lg";
};

export default function BotAvatar({ size = "sm" }: BotAvatarProps) {
  return (
    <div
      className={`chat-bot-avatar${size === "lg" ? " chat-bot-avatar--lg" : ""}`}
      aria-hidden
    >
      CW
    </div>
  );
}
