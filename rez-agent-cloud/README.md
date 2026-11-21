# REZ A.I · Motor de agentes privado

Serviço de agentes para o modo **REZ Avançado**, junto do cérebro já existente, sem mudar o nome mostrado ao visitante. Usa internamente DeepSeek Harness SDK 0.2.2-rc.5, MIT; manter esta atribuição técnica. **Não é o modelo de IA** e não garante inferência grátis.

**Ainda não está publicado.** Necessita máquina/contêiner Node.js persistente: Cloudflare Workers e Vercel Functions não executam este processo. A opção preparada é uma hospedagem de contêineres (ex.: Railway).

## Publicar sem instalações no PC
1. Conecte a hospedagem ao GitHub `jmrzd/REZ-A.I` e selecione esta branch. Configure Root Directory=`rez-agent-cloud` e Dockerfile=`Dockerfile`.
2. Configure os segredos somente no painel privado da hospedagem: `REZ_AGENT_SHARED_SECRET` (aleatório de 32+ caracteres), `DEEPSEEK_API_KEY` (modelos DeepSeek oficiais podem cobrar). Não envie senhas nesta conversa.
3. Use domínio HTTPS autenticado, uma réplica e limites de custos. Não monte repositório principal, credenciais do site, arquivos pessoais ou sockets Docker no contêiner.
4. Na Vercel do projeto `rez-ai`, defina `REZ_AGENT_ENABLED=true`, `NEXT_PUBLIC_REZ_AGENT_PREVIEW=true`, `REZ_AGENT_URL=https://SEU-HOST`, `REZ_AGENT_ALLOWED_HOST=SEU-HOST`, `REZ_AGENT_SHARED_SECRET` igual ao remoto e `REZ_AGENT_ADMIN_KEY` diferente e aleatório (32+ caracteres). Faça deploy da branch em **prévia**, mantendo Vercel Authentication habilitada.
5. Acesse o chat e selecione **REZ Avançado**, inserindo a chave administrativa na aba (não salva), para testar.
6. Só publique após validar a conexão e a cobrança. Desabilite `REZ_AGENT_ENABLED` para voltar ao sistema anterior sem riscos.

O serviço usa SDK perfil `sdk` com patch que remove ferramentas de execução/arquivos/web/plugins e permissões `read-only`. A credencial HTTP não é repassada ao subprocesso do modelo. Mesmo assim, upstream é experimental e **não auditado**, então uso somente administrativo. Mensagens são compartilhadas com o provedor LLM; documentos locais não são enviados neste modo.

O projeto do site continua usando os modos REZ Native, Cloudflare e Local; não houve publicação automática de nenhum serviço. Os testes locais das regras podem ser rodados pelo GitHub Actions.
