"use client";

const PLACEHOLDERS = new Set([
  "Rasm",
  "Фото",
  "Video",
  "Видео",
  "Ovozli xabar",
  "Голосовое",
]);

export type ChatMediaMessage = {
  body: string;
  kind?: string;
  mime?: string;
  mediaUrl?: string;
  localUrl?: string;
};

export function ChatMessageBody({
  message,
  className,
}: {
  message: ChatMediaMessage;
  className?: string;
}) {
  const src = message.localUrl || message.mediaUrl || "";
  const kind = message.kind || "text";
  const showCaption =
    Boolean(message.body) && (kind === "text" || !PLACEHOLDERS.has(message.body.trim()));

  return (
    <div className={className}>
      {kind === "image" && src ? (
        // Chat uploads are authenticated API URLs, not Next/Image assets.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={message.body || "Rasm"}
          className="mb-1 max-h-56 w-full rounded-xl object-cover"
        />
      ) : null}
      {kind === "video" && src ? (
        <video
          src={src}
          controls
          playsInline
          className="mb-1 max-h-56 w-full rounded-xl bg-black"
        />
      ) : null}
      {kind === "voice" && src ? (
        <audio src={src} controls className="mb-1 w-full max-w-full" />
      ) : null}
      {showCaption ? (
        <p className="whitespace-pre-wrap">{message.body}</p>
      ) : kind === "text" ? (
        <p className="whitespace-pre-wrap">{message.body}</p>
      ) : null}
    </div>
  );
}
