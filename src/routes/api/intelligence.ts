import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";

export const Route = createFileRoute("/api/intelligence")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          systemPrompt?: string;
          userPrompt?: string;
        };
        if (!body.systemPrompt || !body.userPrompt) {
          return Response.json(
            { error: "systemPrompt and userPrompt are required" },
            { status: 400 },
          );
        }
        const { resolveAgentModel, selectWorkingModel } = await import("@/lib/audit-agent.server");
        const resolved = await resolveAgentModel();
        if (!resolved) return Response.json({ error: "AI not configured" }, { status: 503 });
        const selected = await selectWorkingModel(resolved);
        if (!selected.model) {
          return Response.json({ error: "No AI provider available" }, { status: 503 });
        }

        const result = streamText({
          model: selected.model.model,
          providerOptions: selected.model.providerOptions as never,
          system: body.systemPrompt,
          prompt: body.userPrompt.slice(0, 60000),
          maxRetries: 2,
          abortSignal: request.signal,
        });

        // Stream plain text — clients just concatenate chunks directly.
        // Do NOT use toTextStreamResponse() which wraps chunks in the AI SDK
        // data-stream protocol (0:"..." lines) that clients would need to parse.
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of result.textStream) {
                controller.enqueue(encoder.encode(chunk));
              }
            } catch {
              // swallow — client sees partial response
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
