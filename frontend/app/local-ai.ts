/**
 * REZ AUTO: an independent chat UI backed by local open-weight models.
 *
 * No paid/free hosted inference, no API token, no server inference.
 * Device-based generation necessarily uses GPU/CPU memory and model weights
 * downloaded from the public model repository on first use.
 *
 * Automatic strategy:
 * - GPU with shader-f16: Qwen2.5 0.5B
 * - GPU without shader-f16: SmolLM2 360M q4f32
 * - No GPU or GPU initialization failure: SmolLM2 135M in a WASM worker.
 *
 * The app presents one assistant. Model selection is an implementation
 * detail instead of a confusing list of externally branded assistants.
 */
import type { WebWorkerMLCEngine } from '@mlc-ai/web-llm';
import { hasRunawayRepetition } from './quality';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };
export type Progress = { text: string; percent?: number; stage?: 'gpu' | 'cpu' };
export type GenerateOptions = {
  messages: ChatTurn[];
  context?: string;
  signal: AbortSignal;
  onProgress: (update: Progress) => void;
  onDelta: (chunk: string) => void;
};

type CpuReply = {
  id: number;
  type: 'progress' | 'delta' | 'error' | 'done';
  text?: string;
  percent?: number;
  message?: string;
};

const GPU_PRIMARY = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
const GPU_COMPAT = 'SmolLM2-360M-Instruct-q4f32_1-MLC';
const CPU_MODEL = 'onnx-community/Qwen2.5-0.5B-Instruct';

const SYSTEM = [
  'Você é a REZ A.I, assistente independente de IA local.',
  'Responda em português do Brasil de forma natural, clara e objetiva.',
  'Evite repetir frases, palavras e introduções desnecessárias.',
  'Quando solicitado, ensine programação com exemplos concretos.',
  'Não invente informações nem afirme ter pesquisado ou executado ferramentas.',
  'Utilize apenas o contexto documental fornecido, quando existir.',
].join(' ');

let gpuInstance: { id: string; worker: Worker; engine: WebWorkerMLCEngine } | null = null;
let cpuWorker: Worker | null = null;
let nextId = 0;

export function hasWebGPU(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.gpu;
}
const abortException = (): DOMException =>
  new DOMException('Geração interrompida.', 'AbortError');

function isAbort(value: unknown): boolean {
  return value instanceof DOMException && value.name === 'AbortError';
}

function errorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || error.name;
  if (error && typeof error === 'object' && 'message' in error)
    return String(error.message);
  try { return String(error); } catch { return 'Falha interna'; }
}

function terminateGPU(worker: Worker) {
  worker.terminate();
  if (gpuInstance?.worker === worker) gpuInstance = null;
}

async function guarded<T>(
  promise: Promise<T>,
  worker: Worker,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) { terminateGPU(worker); reject(abortException()); return; }
    let finished = false;
    const finish = (error?: unknown, result?: T) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', onAbort);
      worker.removeEventListener('error', onError);
      worker.removeEventListener('messageerror', onMessageError);
      if (error !== undefined) reject(error);
      else resolve(result as T);
    };
    const onAbort = () => {
      terminateGPU(worker);
      finish(abortException());
    };
    const onError = (event: ErrorEvent) => {
      terminateGPU(worker);
      finish(new Error(event.message || 'Falha ao executar WebGPU no navegador.'));
    };
    const onMessageError = () => {
      terminateGPU(worker);
      finish(new Error('Falha de comunicação com o motor gráfico.'));
    };
    const timeout = setTimeout(() => {
      terminateGPU(worker);
      finish(new Error('O carregamento ou a resposta da GPU demorou demais. Tentando CPU.'));
    }, timeoutMs);
    signal.addEventListener('abort', onAbort, { once: true });
    worker.addEventListener('error', onError);
    worker.addEventListener('messageerror', onMessageError);
    promise.then(value => finish(undefined, value), error => finish(error));
  });
}

async function gpuChoice(): Promise<string | null> {
  if (!hasWebGPU()) return null;
  try {
    const gpu = navigator.gpu;
    // Prefer the discrete/high-performance adapter; low-power integrated GPUs
    // were making the site fall back to extremely slow CPU inference.
    const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return null;
    return adapter.features.has('shader-f16') ? GPU_PRIMARY : GPU_COMPAT;
  } catch {
    return null;
  }
}

async function runGPU(
  modelId: string,
  messages: ChatTurn[],
  system: string,
  signal: AbortSignal,
  progress: GenerateOptions['onProgress'],
  onDelta: GenerateOptions['onDelta'],
): Promise<void> {
  const { WebWorkerMLCEngine, prebuiltAppConfig } = await import('@mlc-ai/web-llm');
  if (!prebuiltAppConfig.model_list.some(m => m.model_id === modelId))
    throw new Error('O modelo de GPU não está disponível neste catálogo.');

  if (!gpuInstance || gpuInstance.id !== modelId) {
    if (gpuInstance) terminateGPU(gpuInstance.worker);
    progress({ text: 'Preparando o motor local. O primeiro uso baixa os pesos públicos do modelo...', stage: 'gpu' });
    const worker = new Worker(new URL('./webllm.worker.ts', import.meta.url), { type: 'module' });
    const engine = new WebWorkerMLCEngine(worker, {
      initProgressCallback: report => progress({
        text: report.text || 'Baixando modelo aberto...',
        percent: typeof report.progress === 'number'
          ? Math.max(0, Math.min(100, Math.round(report.progress * 100)))
          : undefined,
        stage: 'gpu',
      }),
    });
    gpuInstance = { id: modelId, worker, engine };
    try {
      await guarded(engine.reload(modelId), worker, signal, 240_000);
    } catch (err) {
      terminateGPU(worker);
      throw err;
    }
  }
  if (signal.aborted) throw abortException();
  const { worker, engine } = gpuInstance;
  progress({ text: 'REZ está gerando resposta no seu dispositivo...', stage: 'gpu' });
  try {
    await guarded((async () => {
      const stream = await engine.chat.completions.create({
        messages: [{ role: 'system', content: system }, ...messages],
        stream: true, temperature: 0.35, frequency_penalty: 0.35,
        max_tokens: 240,
      });
      for await (const chunk of stream) {
        if (signal.aborted) throw abortException();
        const delta = chunk.choices[0]?.delta?.content;
        if (typeof delta === 'string' && delta) onDelta(delta);
      }
    })(), worker, signal, 150_000);
  } catch (err) {
    terminateGPU(worker);
    throw err;
  }
}

function runCPU(
  messages: ChatTurn[],
  system: string,
  signal: AbortSignal,
  onProgress: GenerateOptions['onProgress'],
  onDelta: GenerateOptions['onDelta'],
): Promise<void> {
  if (signal.aborted) return Promise.reject(abortException());
  if (!cpuWorker)
    cpuWorker = new Worker(new URL('./cpu.worker.ts', import.meta.url), { type: 'module' });
  const worker = cpuWorker;
  const id = ++nextId;
  return new Promise<void>((resolve, reject) => {
    let finished = false;
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      worker.removeEventListener('message', receive);
      worker.removeEventListener('error', broken);
      worker.removeEventListener('messageerror', broken);
    };
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      cleanup();
      if (error) reject(error); else resolve();
    };
    const destroy = () => {
      worker.terminate();
      if (cpuWorker === worker) cpuWorker = null;
    };
    const abort = () => { destroy(); finish(abortException()); };
    const broken = () => {
      destroy();
      finish(new Error('O motor CPU não iniciou corretamente neste navegador.'));
    };
    const receive = (event: MessageEvent<CpuReply>) => {
      const item = event.data;
      if (!item || item.id !== id) return;
      if (item.type === 'progress') {
        clearTimeout(timer);
        timer = setTimeout(() => {
          destroy();
          finish(new Error('O motor CPU parou de responder. O navegador pode estar sem memória.'));
        }, 240_000);
        onProgress({ text: item.text || 'Carregando IA na CPU...', percent: item.percent, stage: 'cpu' });
      } else if (item.type === 'delta') {
        if (item.text) onDelta(item.text);
      } else if (item.type === 'error') {
        destroy();
        finish(new Error(item.message || 'Erro ao gerar resposta na CPU.'));
      } else if (item.type === 'done') {
        finish();
      }
    };
    let timer = setTimeout(() => {
      destroy();
      finish(new Error('O motor CPU demorou demais para responder.'));
    }, 240_000);
    signal.addEventListener('abort', abort, { once: true });
    worker.addEventListener('message', receive);
    worker.addEventListener('error', broken);
    worker.addEventListener('messageerror', broken);
    worker.postMessage({
      type: 'generate', id, modelId: CPU_MODEL, system, messages,
    });
  });
}

export async function generateLocal({
  messages, context = '', signal, onProgress, onDelta,
}: GenerateOptions): Promise<void> {
  if (signal.aborted) throw abortException();
  if (messages.length === 0) throw new Error('Digite uma mensagem primeiro.');

  const turns = messages.slice(-6).map(m => ({
    role: m.role, content: m.content.slice(0, 1300),
  }));
  const snippets = context.trim().slice(0, 2600);
  const system = snippets ? SYSTEM + '\n\nCONTEXTO DE DOCUMENTOS:\n' + snippets : SYSTEM;
  let received = false;
  let assembled = '';
  const emit = (part: string) => {
    if (!part) return;
    received = true;
    assembled += part;
    onDelta(part);
  };
  const emitGpu = (part: string) => {
    if (hasRunawayRepetition(assembled + part))
      throw new Error('O modelo local começou a repetir palavras sem sentido. A resposta foi interrompida.');
    emit(part);
  };

  const gpu = await gpuChoice();
  let gpuError = '';
  if (gpu) {
    try {
      await runGPU(gpu, turns, system, signal, onProgress, emitGpu);
      if (received) return;
      gpuError = 'O modelo gráfico encerrou sem produzir texto.';
    } catch (err) {
      if (signal.aborted || isAbort(err)) throw abortException();
      gpuError = errorMessage(err);
    }
  }
  if (received) throw new Error('O modelo parou antes de concluir. Sua resposta parcial foi preservada.');

  onProgress({
    text: gpu
      ? 'GPU indisponível para esta sessão. Tentando Qwen local na CPU (pode ser lento)...'
      : 'Sem WebGPU: carregando Qwen na CPU. Para maior velocidade, habilite aceleração gráfica no navegador.',
    stage: 'cpu',
  });
  try {
    await runCPU(turns, system, signal, onProgress, emit);
    if (!received) throw new Error('O modelo CPU encerrou sem gerar texto.');
  } catch (err) {
    if (signal.aborted || isAbort(err)) throw abortException();
    const detail = errorMessage(err);
    if (gpuError)
      throw new Error('Falha na GPU (' + gpuError.slice(0, 140) + '). Tentativa por CPU: ' + detail.slice(0, 200));
    throw new Error('Não foi possível iniciar a IA no dispositivo: ' + detail.slice(0, 240));
  }
}
