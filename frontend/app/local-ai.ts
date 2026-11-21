/**
 * REZ LOCAL ENGINE: inference on the visitor's own GPU or CPU.
 * No inference request is sent to REZ servers or paid API providers.
 * Model weights are downloaded from the original open-weight distribution
 * on first use and cached by the browser (subject to browser storage policy).
 */
import type { MLCEngine } from '@mlc-ai/web-llm';

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
    id: 'qwen-fast',
    label: 'REZ Rápida · Qwen 0.5B',
    engine: 'webgpu',
    modelId: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    memory: '~945 MB de VRAM',
    description: 'Equilibrada para placas de vídeo com menos memória.',
  },
  {
    id: 'qwen-balanced',
    label: 'REZ Plus · Qwen 1.5B',
    engine: 'webgpu',
    modelId: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    memory: '~1,6 GB de VRAM',
    description: 'Melhores respostas, precisa de GPU e mais memória.',
  },
  {
    id: 'qwen-coder',
    label: 'REZ Code · Qwen Coder 1.5B',
    engine: 'webgpu',
    modelId: 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC',
    memory: '~1,6 GB de VRAM',
    description: 'Modelo especializado em tarefas de programação.',
  },
  {
    id: 'smol-cpu',
    label: 'REZ Básica · CPU (135M)',
    engine: 'wasm',
    modelId: 'onnx-community/SmolLM2-135M-Instruct-ONNX-GQA',
    memory: 'Memória RAM; respostas mais simples',
    description: 'Alternativa sem WebGPU, usando CPU via WebAssembly.',
  },
];

const SYSTEM_PROMPT = [
  'Você é REZ A.I, um assistente de inteligência artificial open source.',
  'Responda preferencialmente em português do Brasil, de modo direto, correto e útil.',
  'Se não souber um fato, informe a incerteza. Não invente dados ou alegue',
  'acessar a internet, executar ferramentas ou consultar arquivos quando não tiver feito isso.',
  'Ajude com programação, explicações, escrita e resolução de problemas.',
].join(' ');

export type Progress = { text: string; percent?: number };
export type GenerateOptions = {
  modelId: string;
  messages: ChatTurn[];
  signal: AbortSignal;
  onProgress: (status: Progress) => void;
  onDelta: (text: string) => void;
};

let loadedGpu: { modelId: string; engine: MLCEngine } | null = null;
let loadedCpu: { modelId: string; pipeline: unknown } | null = null;

export function hasWebGPU(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator && !!navigator.gpu;
}

export async function generateLocal({
  modelId, messages, signal, onProgress, onDelta,
}: GenerateOptions): Promise<void> {
  const selected = LOCAL_MODELS.find(m => m.id === modelId);
  if (!selected) throw new Error('Modelo de IA desconhecido.');
  if (signal.aborted) throw new DOMException('Interrompido', 'AbortError');
  if (!messages.length) throw new Error('Envie uma mensagem antes de gerar.');
  // A short window prevents exceeding model context (usually 4K tokens);
  // the model runtime also has its own token limit.
  const relevant = messages.slice(-12).map(m => ({
    role: m.role, content: m.content.slice(0, 2000),
  }));

  if (selected.engine === 'webgpu') {
    if (!hasWebGPU()) {
      throw new Error('WebGPU não está disponível neste navegador. Selecione REZ Básica · CPU.');
    }
    if (!loadedGpu || loadedGpu.modelId !== selected.id) {
      onProgress({ text: 'Preparando o modelo. Na primeira utilização os pesos serão baixados...' });
      const { CreateMLCEngine, prebuiltAppConfig } = await import('@mlc-ai/web-llm');
      if (!prebuiltAppConfig.model_list.some(m => m.model_id === selected.modelId)) {
        throw new Error('Este modelo não está disponível nesta versão do motor WebLLM.');
      }
      if (loadedGpu) {
        await loadedGpu.engine.unload();
        loadedGpu = null;
      }
      const engine = await CreateMLCEngine(selected.modelId, {
        initProgressCallback: progress => {
          onProgress({
            text: progress.text || 'Baixando e carregando modelo local...',
            percent: typeof progress.progress === 'number'
              ? Math.min(100, Math.max(0, Math.round(progress.progress * 100)))
              : undefined,
          });
        },
      });
      loadedGpu = { modelId: selected.id, engine };
    }
    if (signal.aborted) throw new DOMException('Interrompido', 'AbortError');
    const engine = loadedGpu.engine;
    const onAbort = () => { void engine.interruptGenerate(); };
    signal.addEventListener('abort', onAbort, { once: true });
    try {
      onProgress({ text: 'Gerando resposta no seu dispositivo...' });
      const completion = await engine.chat.completions.create({
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...relevant],
        stream: true,
        temperature: 0.6,
        max_tokens: 480,
      });
      for await (const chunk of completion) {
        if (signal.aborted) throw new DOMException('Interrompido', 'AbortError');
        const fragment = chunk.choices[0]?.delta?.content;
        if (typeof fragment === 'string' && fragment) onDelta(fragment);
      }
    } finally {
      signal.removeEventListener('abort', onAbort);
    }
    return;
  }

  // Free CPU fallback for browsers without WebGPU. Smaller model = lower quality.
  onProgress({ text: 'Preparando modelo CPU. O primeiro download pode demorar...' });
  const transformers = await import('@huggingface/transformers');
  if (!loadedCpu || loadedCpu.modelId !== selected.id) {
    const pipe = await transformers.pipeline('text-generation', selected.modelId, {
      device: 'wasm',
      dtype: 'q4',
      progress_callback: info => {
        const event = info as { status?: string; progress?: number; file?: string };
        onProgress({
          text: event.status === 'progress'
            ? 'Baixando modelo CPU: ' + (event.file || 'arquivos...')
            : 'Carregando modelo CPU...',
          percent: typeof event.progress === 'number'
            ? Math.round(Math.max(0, Math.min(100, event.progress))) : undefined,
        });
      },
    });
    loadedCpu = { modelId: selected.id, pipeline: pipe };
  }
  if (signal.aborted) throw new DOMException('Interrompido', 'AbortError');
  onProgress({ text: 'Gerando resposta na CPU; pode ser mais lento...' });
  const pipe = loadedCpu.pipeline as Awaited<ReturnType<typeof transformers.pipeline<'text-generation'>>>;
  let streamed = false;
  const streamer = new transformers.TextStreamer(pipe.tokenizer, {
    skip_prompt: true, skip_special_tokens: true,
    callback_function: (fragment: string) => {
      if (signal.aborted) return;
      streamed = true;
      onDelta(fragment);
    },
  });
  // WASM generation may occupy the main thread. The stop button is best-effort;
  // a worker-based CPU runtime will be implemented in a later phase.
  const output = await pipe(
    [{ role: 'system', content: SYSTEM_PROMPT }, ...relevant],
    { max_new_tokens: 192, do_sample: false, streamer, return_full_text: false },
  );
  if (signal.aborted) throw new DOMException('Interrompido', 'AbortError');
  if (!streamed) {
    const result = Array.isArray(output) ? output[0] : output;
    const answer = result?.generated_text;
    const content = typeof answer === 'string'
      ? answer
      : Array.isArray(answer) ? answer.at(-1)?.content : null;
    if (typeof content === 'string') onDelta(content);
  }
}
