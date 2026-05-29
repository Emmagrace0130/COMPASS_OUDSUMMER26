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
        <div className="shrink-0 w-8 h-8 rounded-full border border-compass-purple/50 flex items-center justify-center text-compass-violet text-xs font-bold mr-2 mt-1">
          C
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? "max-w-[65%]" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "rounded-br-sm"
              : message.error
                ? "rounded-bl-sm"
                : "rounded-bl-sm"
          }`}
          style={
            isUser
              ? { background: "#5b21b6", border: "1px solid #7c3aed", color: "#ffffff" }
              : message.error
                ? { background: "#450a0a", border: "1px solid #7f1d1d", color: "#fca5a5" }
                : { background: "#1e1b4b", border: "1px solid #4c1d95", color: "#e0e7ff" }
          }
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
                strong: ({ children }) => <strong className="font-semibold text-compass-violet">{children}</strong>,
                code: ({ children }) => (
                  <code className="bg-compass-purple/15 text-compass-violet rounded px-1 text-xs font-mono">{children}</code>
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
