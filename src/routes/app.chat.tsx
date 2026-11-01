import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Sparkles, User, StopCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Message, MessageContent, MessageActions, MessageAction, MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/chat")({
  component: ChatPage,
});

const STARTERS = [
  "Analyze my recent transactions",
  "Calculate my capital gains tax",
  "Check for any duplicates or anomalies",
  "Generate a financial report",
];

function ChatPage() {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isEmpty = messages.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("sb-access-token")}`,
        },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          messages: [
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: "user", content: userMessage },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send message");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantMessage = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantMessage += parsed.content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: assistantMessage,
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              // Ignore parse errors for non-JSON chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${(error as Error).message}` },
      ]);
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  }

  function stop() {
    abortController?.abort();
    setIsLoading(false);
  }

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col bg-background">
      {/* ── Conversation ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {isEmpty ? (
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 pt-20 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex size-20 items-center justify-center rounded-3xl"
              style={{ background: "rgba(115,66,226,0.1)" }}
            >
              <Sparkles size={40} strokeWidth={1.5} style={{ color: "var(--color-accent)" }} />
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", marginBottom: "0.5rem" }}>
                Good evening.
              </h1>
              <p className="text-lg" style={{ color: "var(--ink-2)" }}>
                What should we take care of?
              </p>
              <p className="mt-4 text-sm" style={{ color: "var(--ink-3)" }}>
                Your financial intelligence workspace is ready.
              </p>
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid w-full max-w-2xl gap-3 sm:grid-cols-2"
            >
              {STARTERS.map((s, i) => (
                <motion.button
                  key={s}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                  onClick={() => {
                    const form = document.querySelector("form");
                    const textarea = form?.querySelector("textarea");
                    if (textarea) {
                      textarea.value = s;
                      textarea.dispatchEvent(new Event("input", { bubbles: true }));
                    }
                  }}
                  className="rounded-xl border px-4 py-3 text-left text-sm transition-all hover:shadow-md hover:scale-[1.02]"
                  style={{ borderColor: "var(--hairline)", background: "var(--card)" }}
                >
                  {s}
                </motion.button>
              ))}
            </motion.div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Message from={msg.role}>
                    <MessageContent>
                      {msg.role === "user" ? (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <MessageResponse>{msg.content}</MessageResponse>
                      )}
                    </MessageContent>
                  </Message>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-sm"
                style={{ color: "var(--ink-3)" }}
              >
                <Bot size={16} strokeWidth={1.75} style={{ color: "var(--color-accent)" }} />
                <span>AuditX is thinking</span>
                <span className="flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                </span>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Composer ──────────────────────────────────────────────────────── */}
      <div className="border-t px-4 py-4 sm:px-6" style={{ borderColor: "var(--hairline)", background: "var(--card)" }}>
        <div className="mx-auto max-w-3xl">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-end gap-2 rounded-2xl border px-4 py-3 transition-shadow focus-within:shadow-md"
            style={{ borderColor: "var(--hairline)", background: "var(--background)" }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or give AuditX a task..."
              className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              rows={1}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              style={{ minHeight: "24px", maxHeight: "200px" }}
            />
            {isLoading ? (
              <Button
                type="button"
                onClick={stop}
                size="icon-sm"
                variant="ghost"
                className="h-8 w-8 shrink-0"
              >
                <StopCircle size={16} strokeWidth={1.75} />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon-sm"
                disabled={!input.trim()}
                className="h-8 w-8 shrink-0"
                style={{ background: "var(--color-accent)" }}
              >
                <Bot size={16} strokeWidth={1.75} className="text-white" />
              </Button>
            )}
          </form>
          <p className="mt-2 text-center text-xs" style={{ color: "var(--ink-3)" }}>
            AuditX can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
    </div>
  );
}
