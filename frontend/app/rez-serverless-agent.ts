/**
 * REZ Avançado · independent, bounded agent-style orchestration.
 *
 * Runs inside a Vercel Node serverless function, without installing a plugin,
 * mounting a long-running process, external model keys, or executing commands.
 * This is not the full DeepSeek Harness nor a generative language model.
 */
import { nativeAnswer, type NativeAnswer, type NativeMode, type NativeTurn } from './rez-native-core';
import { researchOnWikipedia } from './rez-native-research';

export type AgentRequest = {
  mode: NativeMode;
  messages: NativeTurn[];
  documentContext?: string;
  allowPublicResearch?: boolean;
};

export type AgentResult = {
  text: string;
  engine: 'REZ Avançado';
  method: NativeAnswer['method'];
  sources: NativeAnswer['sources'];
  steps: number;
  model: 'deterministic-retrieval';
};

function tasksFromQuestion(question: string, mode: NativeMode): string[] {
  const trimmed = question.trim();
  // Do not break code snippets or summaries at question marks.
  if (mode === 'code' || mode === 'summary' || trimmed.includes('```')) return [trimmed];
  const parts = trimmed.match(/[^?]+(?:\?|$)/g)?.map(t => t.trim()).filter(Boolean) ?? [];
  if (parts.length < 2 || parts.length > 3 ||
      parts.some(t => t.length < 12 || t.length > 1200)) return [trimmed];
  return parts;
}

export async function runRezAgent(
  request: AgentRequest, signal?: AbortSignal,
): Promise<AgentResult> {
  const last = request.messages.at(-1);
  if (!last || last.role !== 'user') throw Error('Última mensagem inválida.');
  const tasks = tasksFromQuestion(last.content, request.mode);
  const answered: NativeAnswer[] = [];
  for (const task of tasks) {
    const history = [
      ...request.messages.slice(0, -1),
      { role: 'user' as const, content: task },
    ];
    let result = nativeAnswer(history, request.mode, request.documentContext || '');
    // A public lookup sends ONLY the current question, only with user opt-in.
    // At most one lookup per request; never forward private document context.
    if (tasks.length === 1 && result.method === 'fallback' &&
        request.allowPublicResearch === true && request.mode !== 'summary') {
      try {
        const researched = await researchOnWikipedia(task, signal);
        if (researched) result = researched;
      } catch {
        if (signal?.aborted) throw Error('Operação interrompida.');
      }
    }
    answered.push(result);
  }
  const text = answered.length === 1
    ? answered[0].text
    : answered.map((result, i) =>
        '**Pergunta ' + (i + 1) + '**\n\n' + result.text
      ).join('\n\n---\n\n');
  const sources = answered.flatMap(r => r.sources).filter((r,i,a) =>
    a.findIndex(v=>v.url === r.url)===i
  ).slice(0,5);
  const method = answered.some(r => r.method === 'fallback') ? 'fallback'
    : answered.some(r => r.method === 'reference') ? 'reference'
    : answered[0].method;
  return {
    text: text.slice(0, 24000),
    engine: 'REZ Avançado',
    method,
    sources,
    steps: answered.length,
    model: 'deterministic-retrieval',
  };
}
