/**
 * REZ CPU engine v1.2
 *
 * The old 135M model frequently produced incoherent loops. We now use the
 * official ONNX q4 Qwen2.5 0.5B Instruct weights. This requires more RAM
 * and the first download may take longer, but the quality tradeoff is better
 * for actual conversations. All inference stays in this dedicated worker.
 */
import { pipeline, TextStreamer, env } from '@huggingface/transformers';
// Cached model weights and WASM runtime can be reused on a later visit,
// subject to the browser's available storage and eviction policy.
env.useBrowserCache = true;
env.useWasmCache = true;
import { hasRunawayRepetition } from './quality';

type Turn = { role: 'user' | 'assistant'; content: string };
type Incoming = {
  type: 'generate' | 'prepare';
  id: number;
  modelId: string;
  system: string;
  messages: Turn[];
};
type ProgressEvent = { status?: string; progress?: number; file?: string };

const CPU_MODEL = 'onnx-community/Qwen2.5-0.5B-Instruct';
let cached: {
  modelId: string;
  pipeline: Awaited<ReturnType<typeof pipeline<'text-generation'>>>;
} | null = null;

function emit(value: object): void {
  self.postMessage(value);
}

self.onmessage = async (event: MessageEvent<Incoming>) => {
  const cmd = event.data;
  if (!cmd || (cmd.type !== 'generate' && cmd.type !== 'prepare')) return;
  const id = cmd.id;
  const note = (text: string, percent?: number) => emit({
    type: 'progress', id, text, percent,
  });

  try {
    // Never allow the application to select arbitrary third-party model IDs
    // or load unexpected weights from the browser message surface.
    if (cmd.modelId !== CPU_MODEL)
      throw new Error('Modelo CPU não autorizado.');

    if (!cached || cached.modelId !== CPU_MODEL) {
      note('Carregando REZ na CPU. O primeiro uso baixa pesos Qwen em 4 bits; isso pode demorar.');
      const engine = await pipeline('text-generation', CPU_MODEL, {
        device: 'wasm',
        dtype: 'q4',
        progress_callback: info => {
          const state = info as ProgressEvent;
          note(state.status === 'progress'
            ? 'Baixando arquivos da IA local: ' + (state.file ?? 'modelo...')
            : 'Preparando o modelo Qwen na CPU...',
          typeof state.progress === 'number'
            ? Math.max(0, Math.min(100, Math.round(state.progress)))
            : undefined);
        },
      });
      cached = { modelId: CPU_MODEL, pipeline: engine };
    }

    // Preparation loads and caches the pipeline without generating tokens.
    // The worker stays alive so the next real message skips initialization.
    if (cmd.type === 'prepare') {
      note('REZ pronta para responder usando CPU.');
      emit({ type: 'ready', id });
      return;
    }

    note('Gerando resposta na CPU. O modelo maior prioriza coerência, mas pode ser lento.');
    let outputText = '';
    let sentText = false;
    const streamer = new TextStreamer(cached.pipeline.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (part: string) => {
        if (!part) return;
        // Fail visibly instead of streaming endless loops such as
        // "ajudar, ajudar, ajudar" from underpowered/quantized models.
        if (hasRunawayRepetition(outputText + part))
          throw new Error('REZ_OUTPUT_REPETITION');
        outputText += part;
        sentText = true;
        emit({ type: 'delta', id, text: part });
      },
    });

    const last = cmd.messages.at(-1)?.content.toLowerCase() || '';
    const wantsCode = /\b(python|javascript|java|typescript|codigo|código|função|funcao|sql)\b/.test(last);
    const result = await cached.pipeline(
      [{ role: 'system', content: cmd.system }, ...cmd.messages],
      {
        max_new_tokens: wantsCode ? 200 : 128,
        do_sample: false,
        repetition_penalty: 1.17,
        no_repeat_ngram_size: 4,
        return_full_text: false,
        streamer,
      },
    );

    if (!sentText) {
      const first = Array.isArray(result) ? result[0] : result;
      const value = first?.generated_text;
      const text = typeof value === 'string' ? value
        : Array.isArray(value) ? value.at(-1)?.content : null;
      if (typeof text === 'string' && text.trim() && !hasRunawayRepetition(text))
        emit({ type: 'delta', id, text });
    }

    emit({ type: 'done', id });
  } catch (error) {
    const reason = error instanceof Error ? error.message.toLowerCase() : '';
    let message = 'O modelo de CPU falhou. Confira memória RAM, conexão e armazenamento do navegador.';
    if (reason.includes('rez_output_repetition'))
      message = 'A IA local começou a repetir palavras. A geração foi interrompida para evitar uma resposta sem sentido.';
    else if (reason.includes('memory') || reason.includes('allocation'))
      message = 'Memória RAM insuficiente para carregar a IA local Qwen 0.5B.';
    else if (reason.includes('fetch') || reason.includes('network'))
      message = 'O download do modelo aberto falhou. Verifique a conexão e os bloqueadores do navegador.';
    else if (reason.includes('autorizado'))
      message = 'Modelo de CPU não autorizado.';
    emit({ type: 'error', id, message });
  }
};
