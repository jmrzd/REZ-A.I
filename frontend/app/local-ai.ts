/**
 * REZ INDEPENDENT ENGINE v1.
 *
 * 100% text generation on the visitor's device. There is no server LLM,
 * API key, inference endpoint, registration, or per-token charge.
 *
 * WebGPU GPU models run in a WebLLM WebWorker.
 * WASM CPU fallback runs in a separate Transformers.js WebWorker.
 * The first run necessarily downloads public open-weight model assets;
 * subsequent sessions may reuse browser caches.
 */
import type { WebWorkerMLCEngine } from '@mlc-ai/web-llm';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };
export type ModelOption = {
  id: string;
  label: string;
  engine: 'webgpu' | 'wasm';
  modelId: string;
  memory: string;
  description: string;
};

export const LOCAL_MODELS: ModelOption[] = [
  {
    id: 'rez-light',
    label: 'REZ Leve · SmolLM2 360M',
    engine: 'webgpu',
    modelId: 'SmolLM2-360M-Instruct-q4f32_1-MLC',
    memory: '~580 MB de VRAM',
    description: 'Menor consumo de GPU; respostas simples.',
  },
  {
    id: 'rez-fast',
    label: 'REZ Rápida · Qwen2.5 0.5B',
    engine: 'webgpu',
    modelId: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    memory: '~945 MB de VRAM',
    description: 'Melhor equilíbrio entre rapidez e qualidade.',
  },
  {
    id: 'rez-plus',
    label: 'REZ Plus · Qwen2.5 1.5B',
    engine: 'webgpu',
    modelId: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    memory: '~1,6 GB de VRAM',
    description: 'Maior qualidade, exige mais GPU.',
  },
  {
    id: 'rez-code',
    label: 'REZ Code · Qwen Coder 1.5B',
    engine: 'webgpu',
    modelId: 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC',
    memory: '~1,6 GB de VRAM',
    description: 'Especializada em explicações e código.',
  },
  {
    id: 'rez-pro',
    label: 'REZ Pro · Qwen2.5 3B',
    engine: 'webgpu',
    modelId: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    memory: '~2,4 GB de VRAM',
    description: 'Melhor qualidade opcional, download grande.',
  },
  {
    id: 'rez-max',
    label: 'REZ Max · Qwen2.5 7B',
    engine: 'webgpu',
    modelId: 'Qwen2.5-7B-Instruct-q4f16_1-MLC',
    memory: '~5 GB de VRAM',
    description: 'Modelo grande opcional para placas fortes.',
  },
  {
    id: 'rez-cpu',
    label: 'REZ CPU · SmolLM2 135M',
    engine: 'wasm',
    modelId: 'onnx-community/SmolLM2-135M-Instruct-ONNX-GQA',
    memory: 'RAM; modelo pequeno',
    description: 'Alternativa quando WebGPU não existe; qualidade limitada.',
  },
];

const SYSTEM = [
  'Você é REZ A.I, uma aplicação independente usando modelos de pesos abertos.',
  'Responda em português brasileiro, com objetividade e precisão.',
  'Diga quando não souber. Nunca finja ter pesquisado a internet ou executado código.',
  'Para programação, mostre exemplos claros e completos.',
  'Se receber trechos de documentos, use-os como referências e deixe claro quando',
  'uma resposta não for sustentada pelo material fornecido.',
].join(' ');

export type Progress = { text: string; percent?: number };
export type GenerateOptions = {
  modelId: string;
  messages: ChatTurn[];
  signal: AbortSignal;
  context?: string;
  onProgress: (status: Progress) => void;
  onDelta: (text: string) => void;
};

type WorkerReply = {
  type: 'progress' | 'delta' | 'error' | 'done';
  id: number;
  text?: string;
  message?: string;
  percent?: number;
};

let gpuSession: {
  modelId: string;
  worker: Worker;
  engine: WebWorkerMLCEngine;
} | null = null;
let cpuWorker: Worker | null = null;
let nextRequestId = 0;

export function hasWebGPU(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.gpu);
}

function aborted(): DOMException {
  return new DOMException('Geração interrompida.', 'AbortError');
}

function withAbort<T>(promise: Promise<T>, signal: AbortSignal, stop: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) { stop(); reject(aborted()); return; }
    const abort = () => { stop(); reject(aborted()); };
    signal.addEventListener('abort', abort, { once: true });
    promise.then(
      result => { signal.removeEventListener('abort', abort); resolve(result); },
      error => { signal.removeEventListener('abort', abort); reject(error); },
    );
  });
}

async function generateGPU(
  model: ModelOption,
  turns: ChatTurn[],
  system: string,
  signal: AbortSignal,
  onProgress: GenerateOptions['onProgress'],
  onDelta: GenerateOptions['onDelta'],
): Promise<void> {
  if (!hasWebGPU())
    throw new Error('WebGPU não está disponível neste navegador. Selecione REZ CPU.');

  const { WebWorkerMLCEngine, prebuiltAppConfig } = await import('@mlc-ai/web-llm');
  if (!prebuiltAppConfig.model_list.some(m => m.model_id === model.modelId))
    throw new Error('Esse modelo não está no catálogo instalado do WebLLM. Experimente outro.');

  if (!gpuSession || gpuSession.modelId !== model.id) {
    if (gpuSession) {
      gpuSession.worker.terminate(); // Dispose old GPU model before loading another.
      gpuSession = null;
    }
    onProgress({ text: 'Preparando os arquivos do modelo no navegador (primeiro download pode demorar)...' });
    const worker = new Worker(new URL('./webllm.worker.ts', import.meta.url), { type: 'module' });
    const engine = new WebWorkerMLCEngine(worker, {
      initProgressCallback: info => {
        onProgress({
          text: info.text || 'Baixando/carregando modelo local...',
          percent: typeof info.progress === 'number'
            ? Math.round(Math.max(0, Math.min(100, info.progress * 100)))
            : undefined,
        });
      },
    });
    gpuSession = { modelId: model.id, worker, engine };

    try {
      await withAbort(engine.reload(model.modelId), signal, () => {
        worker.terminate();
        if (gpuSession?.worker === worker) gpuSession = null;
      });
    } catch (error) {
      worker.terminate();
      if (gpuSession?.worker === worker) gpuSession = null;
      throw error;
    }
  }

  if (signal.aborted) throw aborted();
  const current = gpuSession.engine;
  const interrupt = () => { void current.interruptGenerate(); };
  signal.addEventListener('abort', interrupt, { once: true });
  try {
    onProgress({ text: 'Gerando com a GPU do seu dispositivo...' });
    const stream = await current.chat.completions.create({
      messages: [{ role: 'system', content: system }, ...turns],
      stream: true,
      temperature: 0.6,
      max_tokens: 640,
    });
    for await (const chunk of stream) {
      if (signal.aborted) throw aborted();
      const part = chunk.choices[0]?.delta?.content;
      if (typeof part === 'string' && part) onDelta(part);
    }
  } finally {
    signal.removeEventListener('abort', interrupt);
  }
}

function generateCPU(
  model: ModelOption,
  turns: ChatTurn[],
  system: string,
  signal: AbortSignal,
  onProgress: GenerateOptions['onProgress'],
  onDelta: GenerateOptions['onDelta'],
): Promise<void> {
  if (!cpuWorker)
    cpuWorker = new Worker(new URL('./cpu.worker.ts', import.meta.url), { type: 'module' });
  const worker = cpuWorker;
  const id = ++nextRequestId;
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(aborted()); return; }

    const cleanup = () => {
      signal.removeEventListener('abort', onAbort);
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onWorkerError);
    };
    const onAbort = () => {
      cleanup();
      // Terminating the worker stops CPU inference immediately. Cached model
      // downloads remain in the browser even though this runtime is reset.
      worker.terminate();
      if (cpuWorker === worker) cpuWorker = null;
      reject(aborted());
    };
    const onWorkerError = () => {
      cleanup();
      worker.terminate();
      if (cpuWorker === worker) cpuWorker = null;
      reject(new Error('O motor CPU parou inesperadamente. Reinicie a conversa.'));
    };
    const onMessage = (event: MessageEvent<WorkerReply>) => {
      const value = event.data;
      if (value.id !== id) return;
      if (value.type === 'progress') {
        onProgress({ text: value.text || 'Preparando modelo CPU...', percent: value.percent });
      } else if (value.type === 'delta') {
        if (value.text) onDelta(value.text);
      } else if (value.type === 'error') {
        cleanup();
        reject(new Error(value.message || 'Falha no modelo CPU.'));
      } else if (value.type === 'done') {
        cleanup();
        resolve();
      }
    };
    signal.addEventListener('abort', onAbort, { once: true });
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onWorkerError);
    worker.postMessage({ type: 'generate', id, modelId: model.modelId, messages: turns, system });
  });
}

export async function generateLocal({
  modelId, messages, signal, context = '', onProgress, onDelta,
}: GenerateOptions): Promise<void> {
  const model = LOCAL_MODELS.find(m => m.id === modelId);
  if (!model) throw new Error('Modelo de IA local não encontrado.');
  if (signal.aborted) throw aborted();
  if (!messages.length) throw new Error('Envie uma mensagem antes de gerar.');

  // Cap the model context to ~4k tokens. Large sources are selected and
  // truncated by the client-side retrieval system, not uploaded to a server.
  const recent = messages.slice(-8).map(m => ({
    role: m.role, content: m.content.slice(0, 1400),
  }));
  const safeContext = context.trim().slice(0, 3500);
  const system = safeContext ? SYSTEM + '\n\nCONTEXTO LOCAL:\n' + safeContext : SYSTEM;
  if (model.engine === 'webgpu') {
    await generateGPU(model, recent, system, signal, onProgress, onDelta);
  } else {
    await generateCPU(model, recent, system, signal, onProgress, onDelta);
  }
}
