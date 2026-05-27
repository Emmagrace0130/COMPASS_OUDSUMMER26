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
        <div className="shrink-0 w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1">
          C
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? "max-w-[65%]" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-blue-800 text-white rounded-br-sm"
              : message.error
                ? "bg-red-50 text-red-700 border border-red-200 rounded-bl-sm"
                : "bg-white border border-slate-200 text-slate-800 shadow-sm rounded-bl-sm"
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
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                code: ({ children }) => (
                  <code className="bg-slate-100 rounded px-1 text-xs font-mono">{children}</code>
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
