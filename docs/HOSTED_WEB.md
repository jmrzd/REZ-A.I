# REZ A.I — Website hospedado sem terminal

A interface Next.js está preparada para hospedagem Vercel. No navegador hospedado, o frontend usa `/api/chat/stream` no mesmo domínio; em localhost mantém a API Python FastAPI.

## Hospedagem inicial
- Projeto Vercel: `rez-ai`, conectado ao GitHub `jmrzd/REZ-A.I`.
- Root Directory: `frontend`.
- Framework: Next.js.
- Deployment Protection (Vercel Authentication) habilitada para **todos** os ambientes.
- Branch de trabalho: `feat/kimi-k3-phase1`; main não foi alterada.

## Ativar Kimi sem terminal
No painel Vercel, selecione projeto `rez-ai` > Settings > Environment Variables e adicione:
- `MOONSHOT_API_KEY`: chave secreta da API Moonshot, **somente no servidor**.
- `REZ_HOSTED_CHAT_ENABLED`: `true`, somente após verificar que o deployment está protegido e autorizado.
- Opcional: `MOONSHOT_MODEL`: `kimi-k3`.

A seguir, execute **Redeploy** no painel Vercel para carregar as variáveis. Não é necessário iniciar backend ou frontend no terminal para o site hospedado. A API de streaming é implementada em uma rota server-side do Next.js.

## Segurança
- O chat online inicia **desativado** por padrão.
- Não remova a proteção Vercel enquanto a API paga estiver disponível sem autenticação e limites de uso por usuário.
- Nunca crie variáveis `NEXT_PUBLIC_MOONSHOT_API_KEY` ou exponha chaves em componentes React.
- `Ollama` só funciona localmente, pois o servidor hospedado não acessa o computador do visitante.
- O histórico permanece em localStorage. Não é sincronizado entre aparelhos.
- A rota hospedada não fornece rate limiting persistente ou login próprio; esses controles são necessários antes de acesso público.
- A plataforma não possui nesta fase memória em nuvem, agentes completos, anexos ou voz.

## Testes
- GitHub Actions valida backend e build Next.js.
- Um build de produção e um teste de API com credencial válida devem ser feitos antes de liberar acesso a terceiros.

## Evolução
1. Login com sessões server-side e proteção por usuário.
2. Rate limiting distribuído e cotas de gasto.
3. Banco de dados PostgreSQL com políticas de acesso.
4. Chat web com RAG, ferramentas e artefatos.
5. PWA e aplicativos mobile/desktop compartilhando a API autenticada.
