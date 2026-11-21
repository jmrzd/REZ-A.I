# REZ A.I — correção de estabilidade do chat (v1.1)

## O que mudou

A interface tem **uma REZ A.I**, sem lista visível de modelos de terceiros. A seleção técnica do motor é automática.

### Respostas instantâneas

Saudações simples como **"Oi"**, **"Olá"**, **"Bom dia"**, **"Tudo bem?"** e comandos básicos de ajuda são atendidos por pequenas regras locais escritas no código do aplicativo em `app/instant-replies.ts`.

**Isso não é geração por um modelo de linguagem.** Cada mensagem assim é identificada como "Resposta rápida do aplicativo". Serve para o usuário receber feedback imediatamente, inclusive sem GPU, conexão ou download de pesos. Não apresentamos respostas pré-programadas como prova de IA avançada.

### Perguntas abertas (gerativas)

Perguntas como "Me ajude a programar", explicações livres e resumo de documentos tentam executar um modelo com **pesos abertos no próprio computador do visitante**:

1. O aplicativo verifica suporte real a WebGPU e recursos do adaptador (`shader-f16`).
2. WebGPU compatível usa um modelo Qwen2.5 0.5B; GPUs sem f16 podem usar um modelo SmolLM2 360M com quantização compatível.
3. Se WebGPU falhar ou não estiver disponível, a REZ tenta uma alternativa SmolLM2 135M na CPU via WebAssembly.
4. Motores executam em Web Workers com controles de interrupção e tempo máximo. Se ambos falharem, o aplicativo informa os motivos conhecidos, em vez de apenas "Falha desconhecida".
5. Os downloads iniciais dos pesos são feitos de repositórios públicos e ficam sujeitos ao cache do navegador. Não ocorre transferência de perguntas a APIs comerciais.

O fallback CPU pode ser lento e não tem qualidade semelhante à dos maiores modelos comerciais. Mesmo no modo automático, são utilizados pesos de terceiros sob suas respectivas licenças — **o modelo fundacional não foi treinado pela REZ do zero**.

### Memória de documentos

O IndexedDB e a busca lexical local permanecem disponíveis. O navegador não sincroniza arquivos e conversas entre dispositivos.

### Validação e limitações

Os testes automatizados verificam saudações instantâneas, mensagens que não devem ser tratadas como respostas prontas, ausência de provedor hospedado e build da interface. **Isso não demonstra que o modelo generativo carregou corretamente num PC específico.** O teste definitivo é executar uma pergunta aberta no navegador real.

O aplicativo não consegue usar zero CPU/RAM/VRAM para geração local; essa é uma limitação física de todos os modelos. O objetivo é escolher automaticamente a alternativa possível, não inventar desempenho.

### Fontes de referência

- WebLLM Web Worker: https://webllm.mlc.ai/docs/user/advanced_usage.html
- Lista de modelos WebLLM: https://webllm.mlc.ai/models/
- Transformers.js (CPU/WASM): https://huggingface.co/docs/transformers.js/
- SmolLM2 ONNX: https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX-GQA

