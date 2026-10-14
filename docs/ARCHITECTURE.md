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


## REZ Permission Engine — primeira implementação (14/10/2026)

**Implementado como módulo independente, ainda NÃO conectado à API, ao chat nem a qualquer executor de ferramentas:**

- `backend/permissions.py`: identificadores de sessão/chamada/ferramenta, impressão digital dos argumentos JSON, aprovação explícita, recibos de uso único, expiração de 120 segundos configurável, bloqueios com padrões e revogação por sessão.
- `backend/tests/test_permissions.py`: 12 testes unitários offline de negação padrão, uso único, alterações de argumento/ferramenta/sessão, prazo, bloqueio, revogação e validação.
- Os 12 testes foram executados com sucesso em ambiente de trabalho isolado antes do envio ao GitHub; a suíte completa do repositório e a integração de ponta a ponta ainda não foram executadas.

**Limites de segurança:** o parâmetro `human_confirmed` é uma pré-condição de integração, não comprova a identidade de uma pessoa por si só. Somente código confiável pode chamar `approve` após verificar a aprovação na interface autenticada. Não criar endpoint público que aceite uma flag de aprovação enviada pelo cliente. O motor armazena autorizações em memória de processo; reiniciar o processo descarta registros. Ações com efeitos colaterais exigirão camada de execução segura, autenticação, isolamento e auditoria antes de ativar ferramentas reais.

**Próximas etapas:** integrar um catálogo de ferramentas explicitamente permitido, interface de consentimento autenticada, execução limitada e testes de integração; depois conectar um cliente MCP quando os controles forem validados.


## REZ Tools Engine — catálogo e executor isolado (14/10/2026)

**Código adicionado, mas ainda sem integração à API HTTP ou ao frontend:**

- `backend/tools_engine.py`: `ToolSpec`, `ToolRegistry`, validação estrita de argumentos (somente chaves registradas, valores string com até 1000 caracteres) e `ToolExecutor` que consulta o `PermissionEngine` antes de chamar um handler confiável.
- `build_demo_registry()` registra exclusivamente `rez__demo__echo`, que devolve uma mensagem em memória e não realiza operações externas.
- `backend/tests/test_tools_engine.py`: 12 cenários de testes para recusa de ferramentas desconhecidas, autorização, chamada única, validação de argumentos, registro duplicado e falha de handler.

**Estado de validação:** arquivos enviados ao GitHub. Esses 12 novos testes ainda devem ser executados na instalação local/CI, junto com a suíte preexistente; nenhum deploy foi feito.

**Limites:** este catálogo não é um cliente MCP e não confere segurança automaticamente a novos handlers. A confirmação humana não é autenticada por `human_confirmed=True` isoladamente: essa flag somente pode ser fornecida por um serviço confiável após verificação real da autorização. Não expor `approve` ou `execute` diretamente a solicitações do modelo ou a clientes anônimos. Para ferramenta de leitura/escrita/terminal serão necessários escopo, sandbox, autenticação, auditoria e cancelamento.


## REZ Tool Review Queue — fluxo de aprovação isolado (14/10/2026)

- `backend/tool_reviews.py`: fila em memória por sessão, visualização das solicitações pendentes, confirmação ou negação, prazo de revisão, congelamento dos argumentos para impedir alterações após a solicitação e revogação.
- `backend/tests/test_tool_reviews.py`: 12 testes offline para fluxo completo, negação, expiração, isolamento entre sessões, replay, validação do catálogo e revogação.

Fluxo: código confiável chama `submit(ToolCall)` → exibe dados de `pending(session_id)` na futura interface → controlador autenticado coleta consentimento explícito → chama `review(session_id, call_id, approved=...)` → em caso de aprovação, `PermissionEngine` concede recibo de uso único e `ToolExecutor` executa somente a ferramenta `rez__demo__echo`.

**Atenção:** não há interface de aprovação, autenticação, armazenamento persistente, endpoint HTTP, conexão MCP ou execução de terminal/arquivos nesta fase. A chamada `review(..., approved=True)` não é por si mesma consentimento humano, e **nunca deve** ser exposta diretamente a pedidos de modelos ou clientes. A fila segura para testes em processo único não é uma solução distribuída/multiprocesso. Não instalar handlers com efeitos externos antes de revisar limites de concorrência, timeout, cancelamento, autenticação e isolamento.

**Validação:** novos testes foram enviados, mas ainda não executados no computador do usuário. Executar `cd backend` e `python -m unittest discover -s tests -v`, confirmar resultado e só então considerar a suíte local validada.


## Laboratório visual de permissões — interface experimental (14/10/2026)

- `frontend/app/ToolApprovalDemo.tsx`: componente de demonstração que exibe nome, descrição, argumentos e ID de uma chamada fictícia `rez__demo__echo`. A pessoa pode decidir aprovar ou negar **somente a simulação**; uma segunda decisão é bloqueada, e uma nova solicitação gera um novo identificador.
- `frontend/app/page.tsx`: botão **Permissões** no cabeçalho, que abre/fecha o laboratório sem interromper o chat.
- `frontend/app/style.css`: visual responsivo, foco visível e labels para controles. Aviso explícito de que nenhuma ferramenta real é executada.

**Barreira de segurança intencional:** a tela **não chama** `PermissionEngine.approve`, `ToolReviewQueue.review` ou qualquer endpoint. O estado é local ao navegador e não constitui consentimento verificável do backend. O modelo também não aciona esta tela automaticamente.

**Próximo passo:** projetar sessão autenticada e contrato servidor-cliente em que o servidor crie a solicitação; o frontend apenas a apresenta e envia a decisão vinculada a uma identidade/sessão comprovada. Exigir proteção contra CSRF e requisições forjadas, checagem de origem, não confiar em IDs ou ferramentas informados pelo cliente, auditoria e testes HTTP antes de ligar a execução. **Não** expor aprovação anônima pela API.

**Estado de testes:** a suíte de 49 testes anteriores foi executada pelo usuário no Windows e passou. Esta mudança de frontend foi commitada, mas o build Next.js e testes de navegador ainda precisam ser executados localmente.


## Fase 3 — modal de consentimento e base isolada de sessão (14/10/2026)

O laboratório em `frontend/app/ToolApprovalDemo.tsx` foi convertido em modal (`role="dialog"`, `aria-modal`, título vinculado, foco inicial, ciclo de Tab e fechamento com Escape). O CSS exibe a janela sobre o chat e mantém os botões de decisão acessíveis ao rolar conteúdo. **A aprovação continua totalmente simulada** e não executa ferramentas.

`backend/sessions.py` introduz uma classe isolada `SessionStore`: token criptograficamente aleatório, somente hash SHA-256 do token armazenado, identidade vinculada, expiração, revogação e limpeza explícita. `backend/tests/test_sessions.py` inclui nove casos unitários. **Ainda não é um sistema de autenticação:** somente um controlador que já tenha autenticado uma pessoa pode emitir token; nenhuma rota HTTP de login, aprovação ou execução foi adicionada. Os tokens são bearer, válidos apenas neste processo, sem persistência; reinícios e múltiplos workers não compartilham estado. A implementação não protege contra XSS, CSRF, roubo de token, falta de rate limit ou autorização de ações reais.

Próxima etapa antes de conectar o frontend: autenticação de identidade verificável, sessão protegida e CSRF/origin checks, controlador vinculado à sessão que seja a única autoridade sobre decisões, limites de recursos e integração testada ponta a ponta. Não expor `issue()` ou `review(... approved=True)` diretamente ao usuário ou ao modelo.

**Validação pendente:** o usuário confirmou a suíte anterior de 49 testes; os nove testes de sessões e o build atualizado do frontend devem ser rodados no Windows após `git pull`.


## Ponte isolada de sessões e aprovação — incremento (14/10/2026)

- `backend/tool_session_controller.py`: `ToolSessionController` resolve um token existente no `SessionStore`, identifica a sessão e cria exclusivamente solicitações `rez__demo__echo` com identificadores aleatórios. Consulta as solicitações daquela sessão, transmite uma decisão de um **controlador confiável** à fila `ToolReviewQueue`, e revoga sessão + fila ao encerrar.
- `backend/tests/test_tool_session_controller.py`: 11 testes adicionais verificam token ausente, listagem, aprovação/negação, isolamento entre usuários e sessões do mesmo usuário, expiração, revogação e replay.

**Importante:** `request_demo` e `decide` são métodos Python internos e **não foram adicionados a `backend/main.py`**. O argumento `approved=True` **não comprova consentimento** por si só; a aplicação confiável deve autenticar e coletar uma decisão humana verificável antes de invocá-lo. O `SessionStore.issue` continua reservado ao integrador autenticado: a emissão não realiza login. O único handler executável por esta ponte é `rez__demo__echo`, que não acessa recursos externos.

Antes de construir rotas HTTP: estabelecer login verificado, política de cookies HttpOnly/SameSite, CSRF e validação de Origin, acesso por identidade, limites/rate limit, logs e estratégia de revogação distribuída. Não conectar diretamente o botão do laboratório à função `decide`.

**Verificação ainda pendente:** os 58 testes anteriores foram confirmados no Windows; os 11 novos devem ser executados com `python -m unittest discover -s tests -v`, total esperado de 69.
