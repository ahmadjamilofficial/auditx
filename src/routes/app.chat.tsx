// ─── /app/chat ── redirect to the full Ask Wab workspace ────────────────────
// The main AI workspace lives at /app/parser — this route just redirects there.

import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/chat")({
  component: ChatRedirect,
});

function ChatRedirect() {
  return <Navigate to="/app/parser" />;
}
