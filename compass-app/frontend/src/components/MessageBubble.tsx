import ReactMarkdown from "react-markdown";
import { SourcesPanel } from "./SourcesPanel";
import type { Message } from "../types";

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-full border border-compass-glow/50 flex items-center justify-center text-compass-glow text-xs font-bold mr-2 mt-1">
          C
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? "max-w-[65%]" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-compass-glow/10 border border-compass-glow/30 text-compass-mist rounded-br-sm"
              : message.error
                ? "bg-red-950/60 text-red-300 border border-red-800/50 rounded-bl-sm"
                : "glass text-compass-mist/90 rounded-bl-sm"
          }`}
        >
          {isUser ? (
            message.content
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-compass-bright">{children}</strong>,
                code: ({ children }) => (
                  <code className="bg-compass-glow/10 text-compass-glow rounded px-1 text-xs font-mono">{children}</code>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-1 px-1">
            <SourcesPanel sources={message.sources} />
          </div>
        )}
      </div>
    </div>
  );
}
