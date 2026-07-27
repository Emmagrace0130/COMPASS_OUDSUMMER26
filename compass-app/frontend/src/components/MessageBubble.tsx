import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { SourcesPanel } from "./SourcesPanel";
import type { Message } from "../types";
import type { Tab } from "../lib/tabMeta";
import { suggestTabs } from "../lib/tabMeta";

interface Props {
  message: Message;
  onTabChange?: (tab: Tab) => void;
}

export function MessageBubble({ message, onTabChange }: Props) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const suggestions = !isUser && !message.error && message.content
    ? suggestTabs(message.content)
    : [];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-full border border-rim bg-dark flex items-center justify-center text-compass-purple text-xs font-bold mr-2 mt-1">
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
              ? { background: "rgb(var(--c-user-bg))", border: "1px solid rgb(var(--c-user-border))", color: "rgb(var(--c-user-text))" }
              : message.error
                ? { background: "rgb(var(--c-err-bg))", border: "1px solid rgb(var(--c-err-border))", color: "rgb(var(--c-err-text))" }
                : { background: "rgb(var(--tw-c-panel))", border: "1px solid rgb(var(--tw-c-rim))", color: "rgb(var(--tw-c-white))" }
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
                strong: ({ children }) => <strong className="font-semibold text-compass-purple">{children}</strong>,
                code: ({ children }) => (
                  <code className="bg-compass-purple/10 text-compass-purple rounded px-1 text-xs font-mono">{children}</code>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {!isUser && !message.error && (
          <div className="mt-1 px-1 flex items-center gap-1">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 text-[10px] text-compass-muted hover:text-compass-purple transition-colors"
              title="Copy response"
            >
              {copied ? (
                <>
                  <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-500">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-1 px-1">
            <SourcesPanel sources={message.sources} />
          </div>
        )}

        {!isUser && suggestions.length > 0 && onTabChange && (
          <div className="mt-2 px-1 flex flex-wrap gap-2 items-center">
            <span className="text-[10px] text-compass-muted uppercase tracking-wide">Explore →</span>
            {suggestions.map(({ tab, label }) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className="text-[10px] font-medium tracking-wide px-2.5 py-1 rounded-lg border border-compass-purple/30 bg-compass-purple/10 text-compass-purple hover:bg-compass-purple/20 hover:border-compass-purple/50 transition-all"
              >
                {label} ↗
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
