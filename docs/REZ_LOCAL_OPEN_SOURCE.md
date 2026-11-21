# REZ A.I Local — arquitetura sem API paga

## Estado deste MVP

A versão web executa modelos abertos **no dispositivo do visitante**, sem enviar as mensagens a servidores de inferência da Moonshot ou OpenAI.
A primeira utilização baixa arquivos dos modelos de um repositório público; esse download pode usar bastante banda e armazenamento do navegador.
Após o download, a inferência local não exige chave de API nem créditos por token. Custos de eletricidade, conexão e hospedagem são separados.

A qualidade e velocidade dependem do navegador, memória, hardware e modelo selecionado. **Não existe comparação independente demonstrando que a REZ A.I supera ChatGPT ou Claude**.

## Implementado

- Frontend Next.js 15, React 19 e TypeScript mantém o visual REZ.
- Motor principal WebLLM (Apache-2.0), inferência WebGPU com streaming de tokens.
- Alternativa Transformers.js / ONNX Runtime Web (Apache-2.0) para CPU/WASM.
- Modelos selecionáveis: Qwen2.5 0.5B geral, Qwen2.5 1.5B geral e Qwen2.5-Coder 1.5B para código, via WebLLM.
- Modelo básico SmolLM2-135M-Instruct-ONNX-GQA executado na CPU para navegadores sem WebGPU. Qualidade de respostas inferior.
- Barra de progresso para o primeiro download, botão parar (GPU; na CPU a interrupção pode não ser imediata), histórico local, copiar resposta.
- A API paga Next.js foi **removida**, assim como Kimi/OpenAI do backend. Backend FastAPI opcional permanece exclusivamente para Ollama em loopback.
- Nenhuma chave de API é usada no fluxo web.

## Como usar

1. Abra a página hospedada (Vercel). Não é necessário iniciar terminal.
2. Selecione um modelo compatível com seu hardware.
3. Envie uma mensagem; aguarde os arquivos serem baixados e o modelo inicializar.
4. Uma vez carregado, converse normalmente. Os pesos podem ficar no cache do navegador, mas o navegador pode removê-los.

Se o navegador não tiver WebGPU, a interface seleciona automaticamente **REZ Básica · CPU**.
Para usar modelos GPU, habilite WebGPU e use uma GPU com memória suficiente. Modelos mais pesados não funcionarão em todos os celulares ou PCs.

## Proveniência e licenças — referências oficiais

| Projeto | Repositório oficial | Uso neste MVP | Licença / cautela |
| --- | --- | --- | --- |
| WebLLM | https://github.com/mlc-ai/web-llm | **Dependência ativa**: geração no navegador via WebGPU | Apache-2.0 |
| Transformers.js | https://github.com/huggingface/transformers.js | **Dependência ativa**: CPU/WASM fallback | Apache-2.0 |
| Qwen2.5 | https://github.com/QwenLM/Qwen2.5 | Pesos Qwen2.5 distribuídos nos registros WebLLM | Conferir licença por variante/peso |
| SmolLM2 | https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct | Pesos de referência do modelo CPU | Conferir model card para redistribuição |
| ONNX SmolLM2 | https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX-GQA | Pesos quantizados usados no CPU | Conferir model card original |
| Ollama | https://github.com/ollama/ollama | Backend opcional somente no computador | MIT |
| LibreChat | https://github.com/LibreChat-AI/LibreChat | Referência de arquitetura multi-modelo | MIT (repositório) |
| Open WebUI | https://github.com/open-webui/open-webui | Referência de UX/modelos locais | Licença própria: NÃO assumir MIT |
| LobeHub | https://github.com/lobehub/lobehub | Referência de UX | Licença própria: verificar termos |
| AnythingLLM | https://github.com/Mintplex-Labs/anything-llm | Referência futura de RAG | MIT (repositório) |
| LangGraph | https://github.com/langchain-ai/langgraph | Referência futura de agentes | MIT (repositório) |
| Haystack | https://github.com/deepset-ai/haystack | Referência futura de busca/RAG | Apache-2.0 |
| LlamaIndex | https://github.com/run-llama/llama_index | Referência futura de indexação | MIT (repositório) |
| vLLM | https://github.com/vllm-project/vllm | Referência futura de servidores próprios | Apache-2.0, exige hardware |
| SGLang | https://github.com/sgl-project/sglang | Referência futura de inferência em GPU | Apache-2.0, exige hardware |
| Hugging Face Transformers | https://github.com/huggingface/transformers | Referência de arquiteturas de LLM | Apache-2.0 |

**Nenhum código desses repositórios foi copiado manualmente.** Apenas as bibliotecas WebLLM e Transformers.js foram adicionadas como dependências. Não há engenharia reversa de sistemas fechados, nem coleta de pesos proprietários.

Fontes de suporte:
- Modelos WebLLM e VRAM estimada: https://webllm.mlc.ai/models/
- WebLLM streaming e inicialização: https://webllm.mlc.ai/docs/user/basic_usage.html
- Transformers.js CPU/WASM: https://huggingface.co/docs/transformers.js/
- Exemplo Next.js + Transformers.js: https://github.com/huggingface/transformers.js/blob/main/packages/transformers/docs/source/tutorials/next-ai-sdk.md

## Escopo ainda não realizado

- Teste manual de geração real WebGPU / CPU nos aparelhos dos usuários.
- Autenticação multiusuário, memória sincronizada, RAG, acesso a internet em tempo real, agentes, arquivos e voz.
- Benchmarks frente a modelos maiores.
- Execução em Web Worker para evitar travamento em algumas CPUs.
- Avaliação de licenças dos pesos para redistribuição de arquivos (atualmente os modelos são baixados de suas fontes).
- Melhorar resiliência a limite de armazenamento e descontinuidade de download.

Próximo passo: testar em navegador real, medir latência/uso de RAM, corrigir problemas e só então priorizar RAG/agentes.
