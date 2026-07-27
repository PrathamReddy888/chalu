import { chatAssistant } from "@/lib/ai";
import { ok, fail, readBody } from "@/lib/api";

// POST /api/ai/chat — { message, history } → reply
export async function POST(req: Request) {
  const { message, history } = await readBody<{ message?: string; history?: { role: string; content: string }[] }>(req);
  if (!message) return fail("message required", 422);
  const reply = await chatAssistant(message, history ?? []);
  return ok({ reply });
}
