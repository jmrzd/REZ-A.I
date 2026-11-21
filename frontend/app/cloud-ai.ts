/**
 * Thin browser streaming client for the REZ's own Cloudflare Worker backend.
 * The browser only contacts same-origin /api/brain on Vercel.
 * It does not load or execute any LLM weights.
 */
export type CloudTurn = { role: 'user' | 'assistant'; content: string };

type CloudEvent = {
  choices?: Array<{ delta?: { content?: string | null } }>;
  response?: string;
  error?: { message?: string } | string;
};

export function parseBrainEvent(text: string): { delta?: string; done?: boolean; error?: string } {
  const data = text.split('\n').filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trim()).join('\n');
  if (!data) return {};
  if (data === '[DONE]') return { done: true };
  try {
    const payload = JSON.parse(data) as CloudEvent;
    if (payload.error) return { error: 'O servidor de IA encontrou um erro. Tente novamente.' };
    const chunk = payload.choices?.[0]?.delta?.content;
    if (typeof chunk === 'string' && chunk) return { delta: chunk };
    if (typeof payload.response === 'string' && payload.response) return { delta: payload.response };
  } catch {
    return { error: 'O servidor enviou dados inválidos.' };
  }
  return {};
}

export async function generateHosted(
  turns: CloudTurn[],
  context: string,
  signal: AbortSignal,
  onDelta: (text: string) => void,
): Promise<void> {
  const messages = turns.slice(-12).map(t => ({
    role: t.role,
    content: t.content.slice(0, 2000),
  }));
  // Retrieval stays local by default. Only relevant excerpts (not full files)
  // are explicitly sent when the visitor chooses the Cloud mode.
  if (context.trim()) {
    const last = messages.at(-1);
    if (last && last.role === 'user') {
      last.content = (last.content.slice(0, 1200) +
        '\n\nTRECHOS DOS DOCUMENTOS ADICIONADOS PELO USUÁRIO:\n' +
        context.trim().slice(0, 1400)).slice(0, 3000);
    }
  }

  const response = await fetch('/api/brain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    signal,
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const error = data && typeof data === 'object' && 'error' in data &&
      typeof data.error === 'string' ? data.error
      : 'O cérebro da REZ não está disponível.';
    throw new Error(error);
  }
  if (!response.body) throw new Error('O servidor não iniciou a resposta por streaming.');

  const stream = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let hadText = false;
  let finished = false;
  const apply = (frame: string) => {
    const part = parseBrainEvent(frame);
    if (part.error) throw new Error(part.error);
    if (part.delta) { hadText = true; onDelta(part.delta); }
    if (part.done) finished = true;
  };

  try {
    while (!finished) {
      const chunk = await stream.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true }).replace(/\r\n/g, '\n');
      let separator = buffer.indexOf('\n\n');
      while (separator !== -1) {
        apply(buffer.slice(0, separator));
        buffer = buffer.slice(separator + 2);
        separator = buffer.indexOf('\n\n');
      }
      if (buffer.length > 65_536) throw new Error('Resposta do servidor grande demais.');
    }
    buffer += decoder.decode();
    if (buffer.trim() && !finished) apply(buffer);
    if (!hadText) throw new Error('O servidor não gerou texto. Confira o estado do cérebro na nuvem.');
  } finally {
    await stream.cancel().catch(() => undefined);
  }
}
