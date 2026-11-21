# REZ A.I independente — v1.0 sem chaves nem API de geração

## O que esta versão faz de verdade

A REZ A.I é uma **plataforma independente de chat e ferramentas locais**, construída com software aberto. Ela **não é um modelo de IA treinado do zero**: executa pesos públicos existentes (Qwen/SmolLM2), com interface, seleção de modelos, memória documental e experiência de uso desenvolvidas no repositório REZ-A.I.

**Zero chaves:** não existe dependência de Moonshot, Groq, OpenAI API, Vercel AI Gateway ou de serviços de inferência pagos/gratuitos na página. A rota `/api/chat/turbo` foi excluída. O frontend não envia conversas a servidores REZ para geração.

**Custo de execução do chat:** sem cobrança por token ao REZ ou a terceiros. Hospedagem do site, energia, armazenamento e internet continuam sendo recursos com possíveis custos.

**Limite físico:** um modelo de linguagem precisa de memória RAM ou VRAM **em algum dispositivo**. Sem GPU em servidor, o dispositivo do visitante faz o trabalho. Não é tecnicamente possível prometer desempenho/qualidade equivalentes ao GPT-6, zero uso de memória e zero custo de computação ao mesmo tempo.

## Modelos disponíveis

| Modelo | Execução | VRAM estimada | Uso |
| --- | --- | --- | --- |
| REZ Leve · SmolLM2 360M | WebGPU | ~580 MB | Conversas simples e dispositivos menores |
| REZ Rápida · Qwen2.5 0.5B | WebGPU | ~945 MB | Modo padrão quando existe WebGPU |
| REZ Plus · Qwen2.5 1.5B | WebGPU | ~1,6 GB | Respostas melhores |
| REZ Code · Qwen2.5 Coder 1.5B | WebGPU | ~1,6 GB | Código |
| REZ Pro · Qwen2.5 3B | WebGPU | ~2,4 GB | Maior capacidade opcional |
| REZ Max · Qwen2.5 7B | WebGPU | ~5 GB | GPUs potentes; download grande |
| REZ CPU · SmolLM2 135M | WebAssembly CPU | RAM (varia) | Navegadores sem WebGPU; qualidade limitada |

Memórias são estimativas do catálogo WebLLM, não requisitos garantidos. Alguns navegadores/dispositivos podem falhar mesmo quando parecem ter memória suficiente. Nenhum modelo é baixado automaticamente ao simplesmente abrir o site; só após o usuário pedir uma resposta nesse modelo.

O WebLLM é executado por um **Web Worker**. O Transformers.js executa o fallback CPU em outro **Web Worker**. O botão Parar cancela CPU encerrando o worker e interrompe o WebLLM durante geração. Downloads da primeira inicialização são feitos dos repositórios públicos dos pesos e podem ocupar centenas de MB ou GB; os caches ficam sujeitos às regras do navegador.

## Memória sem servidor

- Clique **Memória** e **Adicionar arquivo**.
- Formatos: TXT, MD, CSV, JSON, JS, TS, TSX, PY, SQL, LOG.
- Máximo de 250 KB por documento e 20 documentos.
- Os documentos ficam no IndexedDB do próprio navegador, não em servidores REZ.
- Em cada pergunta, uma busca **lexical com pontuação BM25 simplificada** seleciona até quatro trechos do material e os injeta no contexto da IA. Não são embeddings semânticos; as respostas podem omitir contextos relacionados com palavras diferentes.
- O nome dos documentos consultados aparece junto ao chat. Você pode apagar documentos diretamente no painel.
- A memória é por navegador/dispositivo e não sincroniza entre aparelhos. O histórico também é local e pode ser exportado em JSON.

## Verificações de segurança

- Não coloque senhas ou informações sigilosas em arquivos de pesos desconhecidos. Instale somente modelos públicos do catálogo.
- O navegador **faz downloads dos pesos de seus distribuidores originais**. Não confunda isso com enviar suas mensagens a um provedor de geração.
- Conversas e arquivos são processados localmente; nenhuma integração com web search/arquivos remotos é usada.
- Mantenha atenção aos riscos de navegadores compartilhados: outras pessoas com acesso ao seu perfil podem ver os dados locais.
- A opção **Permissões** da UI continua demonstrativa; não significa que um agente tenha acesso a seu sistema operacional.

## Testes, implantação e próximos passos

O GitHub Actions executa testes de recuperação local e de ausência da rota de inferência na nuvem, além do build de produção do Next.js e testes Python legados. Somente um teste manual real de geração no seu navegador pode comprovar o desempenho e a compatibilidade com sua GPU/CPU.

Próximas fases propostas: PDF em IndexedDB com extração local, indexação semântica por embeddings locais, ferramentas aprovadas pelo usuário, qualidade via avaliação de benchmarks e eventual ajuste fino LoRA em hardware próprio. Nenhuma dessas fases está prometida como já concluída.

### Tecnologias e documentação oficial

- WebLLM (Apache-2.0): https://github.com/mlc-ai/web-llm
- Modelos, VRAM e versões: https://webllm.mlc.ai/models/
- Web Workers WebLLM: https://webllm.mlc.ai/docs/user/advanced_usage.html
- Transformers.js: https://github.com/huggingface/transformers.js
- Transformers.js WASM: https://huggingface.co/docs/transformers.js/
- Qwen2.5: https://github.com/QwenLM/Qwen2.5
- SmolLM2: https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct
- Transformers.js model CPU: https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX-GQA

Consulte as licenças específicas dos **pesos** antes de redistribuí-los. Não há engenharia reversa de modelos proprietários.
