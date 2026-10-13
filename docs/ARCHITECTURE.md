# Arquitetura — Rez A.I

## Objetivo
Construir uma plataforma de IA independente da interface e do provedor, capaz de alternar entre modelos locais e serviços hospedados. A implementação atual é um **MVP**; o diagrama futuro não representa recursos já existentes.

## MVP 0.1
- **Frontend:** Next.js / TypeScript, chat e histórico temporário no `localStorage`.
- **Backend:** FastAPI com `GET /health` e `POST /chat`.
- **Provedor local:** Ollama, usando `OLLAMA_URL` e `OLLAMA_MODEL` definidos no servidor.
- **Provedor de nuvem:** API OpenAI com `OPENAI_API_KEY` e `OPENAI_MODEL` no servidor.
- **Seleção:** manual, feita pela interface.

## API inicial
`POST /chat` recebe:

```json
{
  "provider": "local",
  "messages": [
    { "role": "user", "content": "Olá, Rez A.I!" }
  ]
}
```

A resposta bem-sucedida tem o formato `{"reply":"..."}`. O corpo aceita até 30 mensagens, e cada mensagem tem limite de 12.000 caracteres. **Este contrato pode mudar durante a fase experimental.**

## Arquitetura pretendida
```text
Interface web / aplicativos
           |
      Rez Core API
      /    |     \
  Auth   Memória   Observabilidade
           |
   Orquestrador de modelos
     /      |       \
 Ollama   APIs     Ferramentas
     \      |       /
     Avaliações e políticas
```

## Critérios de evolução
1. Isolar provedores por adapters com contrato comum.
2. Implementar testes de integração e avaliação antes de trocar modelos.
3. Armazenar conversas com opt-in, exclusão e autenticação.
4. Medir latência, custo, uso de memória e qualidade por tarefa.
5. Implementar streaming, RAG e ferramentas com limites e permissões.
6. Só então adicionar roteamento dinâmico e agentes.

## Segurança
Nunca enviar chaves privadas ao frontend. Antes do deploy público, acrescentar autenticação, rate limiting, restrição de CORS por ambiente, logs sem informações sensíveis, validação de ferramentas e limites de custo.

## Subsistemas planejados: REZ THINK e REZ MEMORY

Esses recursos **não estão ativos** no MVP. [REZ THINK](REZ_THINK.md) gerenciará estratégia/esforço de inferência, respeitando as capacidades do provedor; [REZ MEMORY](REZ_MEMORY.md) armazenará histórico consentido e recuperará evidências entre chats. Os seletores são **independentes**. A arquitetura prevê `Rez Core → Auth/Consent → Memory Retrieval → Model Router/Think → Security Policy → Tools`, com filtro de autorização antes de expor resultados e sem conceder poderes de sistema por escolha de nível.


## Primeira aplicação da pesquisa Claude Desktop — outubro de 2026

**Implementado no repositório (ainda pendente de execução e verificação local):**
- `backend/providers.py`: adaptadores separados para Ollama e OpenAI, com chave de API mantida no servidor e tratamento de falhas HTTP/respostas inesperadas.
- `backend/main.py`: contrato HTTP existente preservado, delegação dos provedores ao módulo `providers`.
- `backend/tests/test_api.py`: seis testes iniciais de saúde, contrato da API e validação de limites, executáveis com `cd backend && python -m unittest discover -s tests -v`.

**Próximas entregas, NÃO implementadas ainda:**
1. Validar os testes localmente e adicionar testes dos adaptadores com provedores simulados (sem rede).
2. Implementar observabilidade sem vazar prompts ou segredos e configurar CORS por ambiente.
3. Estruturar projeto desktop original com Electron + React/TypeScript e ferramentas públicas, compartilhando contratos com a API web.
4. Configurar isolamento do renderer, preload mínimo e IPC validado por esquemas, origem e permissão.
5. Adicionar consentimento explícito e sandbox para ferramentas de arquivos, terminal, microfone, câmera e captura de tela.
6. Estudar integração MCP com lista de ferramentas permitidas e testes de autorização.

**Origem das ideias:** observações de pacotes e processos do Claude Desktop em [docs/research/claude-desktop-windows-2026-10.md](research/claude-desktop-windows-2026-10.md). Isso não autoriza copiar código proprietário nem implica que a arquitetura interna seja idêntica. Dependências encontradas na pesquisa não serão instaladas automaticamente sem um caso de uso, revisão de licença e avaliação de segurança.
