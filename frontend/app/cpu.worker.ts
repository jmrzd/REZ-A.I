/**
 * Transformers.js on CPU, entirely inside a Web Worker.
 * Nothing is sent to the REZ backend; model files are fetched from Hugging Face
 * only when the visitor explicitly selects this CPU fallback.
 */
import { pipeline, TextStreamer } from '@huggingface/transformers';

type Turn = { role: 'user' | 'assistant'; content: string };
type Incoming = {
  type: 'generate';
  id: number;
  modelId: string;
  system: string;
  messages: Turn[];
};
type ProgressEvent = { status?: string; progress?: number; file?: string };

let cached: {
  modelId: string;
  pipeline: Awaited<ReturnType<typeof pipeline<'text-generation'>>>;
} | null = null;

function emit(value: object): void {
  self.postMessage(value);
}

self.onmessage = async (event: MessageEvent<Incoming>) => {
  const cmd = event.data;
  if (cmd?.type !== 'generate') return;
  const id = cmd.id;
  const note = (text: string, percent?: number) => emit({
    type: 'progress', id, text, percent,
  });

  try {
    if (!cached || cached.modelId !== cmd.modelId) {
      note('Baixando modelo CPU na primeira utilização. Os arquivos ficam no cache do navegador.');
      const engine = await pipeline('text-generation', cmd.modelId, {
        device: 'wasm',
        dtype: 'q4',
        progress_callback: info => {
          const state = info as ProgressEvent;
          note(state.status === 'progress'
            ? 'Baixando ' + (state.file ?? 'pesos CPU...')
            : 'Inicializando IA na CPU...', typeof state.progress === 'number'
              ? Math.max(0, Math.min(100, Math.round(state.progress)))
              : undefined);
        },
      });
      cached = { modelId: cmd.modelId, pipeline: engine };
    }

    note('Gerando resposta local na CPU...');
    let gotToken = false;
    const streamer = new TextStreamer(cached.pipeline.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (token: string) => {
        if (!token) return;
        gotToken = true;
        emit({ type: 'delta', id, text: token });
      },
    });

    const result = await cached.pipeline(
      [{ role: 'system', content: cmd.system }, ...cmd.messages],
      { max_new_tokens: 220, do_sample: false, return_full_text: false, streamer },
    );

    if (!gotToken) {
      const first = Array.isArray(result) ? result[0] : result;
      const value = first?.generated_text;
      const text = typeof value === 'string' ? value
        : Array.isArray(value) ? value.at(-1)?.content : null;
      if (typeof text === 'string' && text.trim())
        emit({ type: 'delta', id, text });
    }

    emit({ type: 'done', id });
  } catch (error) {
    const reason = error instanceof Error ? error.message.toLowerCase() : '';
    let message = 'O modelo CPU falhou. Experimente outro navegador ou dispositivo.';
    if (reason.includes('memory') || reason.includes('allocation'))
      message = 'O dispositivo não tem memória RAM suficiente para este modelo.';
    else if (reason.includes('fetch') || reason.includes('network'))
      message = 'Falha de rede no download dos pesos. Confira sua conexão e tente novamente.';
    emit({ type: 'error', id, message });
  }
};
