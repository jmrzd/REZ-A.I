# Fase 1 — Kimi K3 + Streaming (branch feat/kimi-k3-phase1)

Esta fase nao equivale ao produto 1.0 completo. O MVP continua indicado para ambiente local.

## Auditoria do repositorio (20/11/2026)

- Frontend: Next.js 15 / React 19 / TypeScript. Historico local no navegador. O chat anterior usava apenas POST /chat e esperava a resposta completa.
- Backend: FastAPI + httpx. Antes havia apenas Ollama local e OpenAI cloud. GET /health e POST /chat estao mantidos.
- Modulos auxiliares: credenciais, sessoes, permissoes, ferramentas, PostgreSQL e OS Agent ja existem em diferentes estagios. Nao sao automaticamente ativados pelo chat.
- Sem autenticacao e rate limiting no endpoint de chat: **nao publicar uma instancia aberta na internet**.
- Testes: suite unittest presente; adicionar cobertura do contrato Kimi e streaming. Dependencias em requirements e package.json ainda devem ser auditadas com verificadores de vulnerabilidade em CI.

## Funcionalidades desta entrega

1. Terceiro provedor: Kimi K3 via API oficial Moonshot, parametro model kimi-k3, com chave somente no servidor.
2. Esforco de raciocinio: low, high ou max; parametro enviado apenas ao Kimi.
3. Streaming SSE em POST /chat/stream para Ollama, OpenAI e Moonshot, preservando POST /chat legada.
4. Reasoning_content recebido pelo streaming Kimi, mantido nas mensagens do navegador e reenviado ao Kimi nas proximas requisicoes. Nao mostrado como resposta. **Tool calls ainda nao suportados**.
5. UI com seletor de provedor, nivel de raciocinio, resposta progressiva e botao de parar.
6. Testes de configuracao/contratos de endpoint; GitHub Actions com testes e build.
7. Mensagens de erro sanitizadas; endpoint principal exige uma chave configurada para usar Kimi.

## Configurar e executar

Backend:
- Python 3.10+; recomendamos Python 3.12.
- Execute na pasta backend: python -m venv .venv
- Ative .venv e instale: pip install -r requirements.txt
- Copie .env.example para .env e adicione MOONSHOT_API_KEY obtida em https://platform.kimi.ai.
- Inicie apenas em loopback: uvicorn main:app --host 127.0.0.1 --port 8000

Frontend:
- Entre em frontend, execute npm install e npm run dev.
- Acesse http://localhost:3000 e escolha Kimi K3 e Low/High/Max.

Testes:
- cd backend && python -m unittest discover -s tests -v
- cd frontend && npm run build

As suites usam mocks e nao exigem chave paga. Um teste real com o Kimi K3 requer uma chave valida e saldo em conta; nao afirmar validacao real sem essa execucao.

## API

POST /chat/stream recebe JSON:
{"provider":"kimi","reasoning_effort":"high","messages":[{"role":"user","content":"Ola"}]}

O body de retorno e text/event-stream com eventos data em JSON:
- {"type":"reasoning","content":"..."} — metadata para continuidade, nao resposta final
- {"type":"delta","content":"Ola"}
- {"type":"done"}
- {"type":"error","message":"..."} — falha sanitizada

POST /chat continua retornando {"reply":"..."}, mas o metodo legado nao retorna metadados de raciocinio. Para dialogo Kimi com raciocinio preservado, utilizar /chat/stream.

## Limites explicitos

- Sem tool calling completo, RAG, arquivos, memoria sincronizada, voz ou autenticacao de usuarios.
- Sem API key real no CI; nenhuma inferencia real foi comprovada automaticamente.
- Sem garantias de suporte universal a video/imagens nesta fase.
- O historico continua no localStorage: nao enviar dados privados.
- A retencao de reasoning_content em localStorage sera substituida por armazenamento seguro autorizado na etapa de persistencia.
- A exposicao publica exige autenticacao, controle de custos, limites por usuario, CSP e auditoria.
- O contexto de 1M tokens e capacidade maxima do modelo, nao janela liberada por este MVP (a API REZ limita mensagens).

## Referencias tecnicas para fases futuras (sem codigo incorporado)

| Projeto | Fonte oficial | Licenca/nota |
| --- | --- | --- |
| Kimi K3 | https://github.com/MoonshotAI/Kimi-K3 | Kimi K3 License: revisar termos antes de distribuir pesos |
| LibreChat | https://github.com/LibreChat-AI/LibreChat | MIT (GitHub) |
| Open WebUI | https://github.com/open-webui/open-webui | Open WebUI License com exigencias proprias |
| LobeHub | https://github.com/lobehub/lobehub | Licenca comunitaria; revisar antes de reutilizar |
| LangGraph | https://github.com/langchain-ai/langgraph | MIT (GitHub) |
| Haystack | https://github.com/deepset-ai/haystack | Apache-2.0 (GitHub) |
| LlamaIndex | https://github.com/run-llama/llama_index | MIT (GitHub) |
| vLLM | https://github.com/vllm-project/vllm | Apache-2.0 (GitHub) |
| Ollama | https://github.com/ollama/ollama | MIT (GitHub) |
| AnythingLLM | https://github.com/Mintplex-Labs/anything-llm | MIT (GitHub) |

Essas fontes foram verificadas para referencia. **Nenhum codigo de terceiros foi copiado** nesta fase.

API oficial: https://platform.kimi.ai/docs/guide/kimi-k3-quickstart
