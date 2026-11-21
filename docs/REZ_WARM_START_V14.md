# REZ A.I v1.4 — Carregamento antecipado sem API

## O que muda

O print mostrava "que horas são" iniciando o download do modelo ONNX. O horário é consultado diretamente no relógio do navegador e respondido como resposta rápida, sem modelo generativo.

Para outras perguntas, o botão **Preparar IA** permite escolher quando baixar e carregar os pesos públicos. Ao concluir aparece **IA pronta**; durante a mesma sessão da aba, o motor GPU/CPU fica ativo e as perguntas seguintes não precisam inicializar o modelo novamente.

- A preparação não gera mensagem falsa: carrega o motor WebGPU ou envia um comando de preparação ao CPU Worker.
- O Transformers.js usa cache de modelos e WASM no navegador. O browser pode remover arquivos por falta de armazenamento ou configurações de privacidade.
- O botão é opcional e iniciado pelo usuário: nada de baixar centenas de MB silenciosamente ao abrir o site.
- A preparação pode ser cancelada. O site mostra progresso e informa qual processador está sendo usado.
- O servidor REZ não executa IA. Nenhuma chave de API, cartão ou token de serviço é necessário.

## Limite importante

Nenhum código elimina o primeiro download de um modelo local, o uso de memória ou o tempo de geração. Preparar IA antecipa esse trabalho; não acelera a produção de tokens na CPU. No Brave, habilitar a aceleração gráfica e o WebGPU pode ajudar, dependendo dos drivers.

Referências:
- https://webllm.mlc.ai/docs/user/api_reference.html
- https://huggingface.co/docs/transformers.js/en/api/env

## Validação

- "que horas são?" deve responder imediatamente pelo relógio local.
- "Preparar IA" deve carregar o modelo com autorização, sem emitir uma resposta fictícia.
- Pergunta aberta após "IA pronta" deve usar o motor carregado.
- Os testes e o build comprovam integridade de código, não desempenho ou compatibilidade GPU no computador do usuário.
