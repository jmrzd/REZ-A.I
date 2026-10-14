# REZ A.I — caminho para disponibilização online

Status: **planejamento e fundações de segurança**. O aplicativo atual ainda não está pronto para acesso público. Este documento registra a decisão de preparar a plataforma para múltiplos usuários sem afirmar que os serviços já estão implementados.

## Arquitetura alvo

- Frontend: Next.js, com interface e marca próprias; inspiração de usabilidade em chats modernos, incluindo Claude, sem copiar identidade visual.
- API: FastAPI; autenticação, autorização e validação no servidor. Nunca confiar em IDs de usuário ou flags de consentimento enviados pelo modelo.
- Persistência: PostgreSQL para contas, conversas e registros de consentimento; migrações versionadas e backups testados.
- IA: provedores configuráveis, com chaves guardadas exclusivamente no backend. Limites por conta e proteção contra custos inesperados.
- Ferramentas: lista explícita de capacidades, pedidos imutáveis, confirmação humana por ação e registro de auditoria. Nenhuma ferramenta privilegiada pública até que a cadeia de confiança esteja testada.

## Etapas obrigatórias antes de publicar

1. Escolher hospedagem, domínio e provedor de identidade confiável; definir política de cadastro, verificação de e-mail e recuperação de conta.
2. Integrar login e sessões persistentes, revogáveis, com cookies HttpOnly, Secure, SameSite e escopo adequado. Não armazenar tokens de sessão em localStorage.
3. Proteger mutações contra CSRF, validar Origin/Host, configurar CORS com origens exatas e exigir HTTPS.
4. Adicionar banco de dados, migrações e autorização por proprietário em cada consulta. Um usuário nunca deve consultar histórico, ferramentas ou arquivos de outro.
5. Adicionar rate limiting distribuído, monitoramento, limites de uso/custo, logs sem segredos e auditoria.
6. Validar testes de integração, build de frontend, dependências, isolamento multiusuário, backup/restauração e políticas de privacidade antes de abrir o acesso.

## O que já existe

- `backend/credentials.py`: hash/verificação de senha, isolado.
- `backend/local_auth.py`: login local em memória com bloqueio por instância; **não serve como autenticação multiusuário em produção**.
- `backend/sessions.py`: sessões em memória; **não persistentes**.
- `backend/tool_session_controller.py`: ponte interna de revisão, somente demo.
- `backend/deployment_config.py`: validação de origens HTTPS e políticas mínimas de cookies para um futuro ambiente público; **ainda não ligada à API HTTP**.
- `backend/main.py`: rotas atuais `/health` e `/chat`, sem autenticação. **Não publicar esta API como serviço público sem implementar os controles acima.**

## Critério de liberação

Não implantar em ambiente público enquanto `/chat`, dados pessoais, operações com ferramentas e gerenciamento de conta não tiverem proteção de autenticação/autorização adequada, testes de isolamento e limites de abuso. A política de implantação, isoladamente, não protege rotas.

## Verificação

O usuário confirmou 79 testes anteriores. `backend/tests/test_local_auth.py` ainda requer confirmação local de execução (total anterior esperado 91); `backend/tests/test_deployment_config.py` acrescenta 13 casos. Total esperado após atualizar: **104 testes**, sujeito à execução real.
