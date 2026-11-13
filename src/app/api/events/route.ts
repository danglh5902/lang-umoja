import { worldEmitter, type WorldEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const encoder = new TextEncoder();
  let handler: ((e: WorldEvent) => void) | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;

  const cleanup = () => {
    if (interval) clearInterval(interval);
    if (handler) worldEmitter.off("world", handler);
    interval = null;
    handler = null;
  };

  const stream = new ReadableStream({
    start(controller) {
      const send = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          cleanup();
        }
      };
      handler = (e: WorldEvent) => send(`data: ${JSON.stringify(e)}\n\n`);
      worldEmitter.on("world", handler);
      send(`: connected\n\n`);
      interval = setInterval(() => send(`: ping\n\n`), 25000);
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // reverse proxy (nginx...) không được giữ lại luồng sự kiện realtime
      "X-Accel-Buffering": "no",
    },
  });
}
