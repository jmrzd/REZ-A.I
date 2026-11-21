# REZ A.I + DeepSeek Harness: execução na nuvem (privada)

Esta pasta empacota o CLI oficial [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) `@deepseek-ai/dsh@0.2.2-rc.5` em um serviço Node.js persistente. **Nenhum download ou instalação é necessário no PC do usuário.**

> **Importante:** este deployment é um **ambiente de agentes para o operador**, separado do chat público da Rez A.I. Ele NÃO substitui o modelo usado por `/api/brain`, NÃO adiciona automaticamente inteligência ao site e NÃO concede ferramentas à IA pública. O projeto upstream é experimental e explicitamente não auditado para produção.

## Publicação pela interface web (exemplo: Railway)

1. No painel da plataforma de hospedagem, crie um novo serviço **a partir do GitHub** `jmrzd/REZ-A.I`; selecione a branch onde esta pasta foi incorporada.
2. Configure **Root Directory = `harness-cloud`** e **Dockerfile = `Dockerfile`**. A plataforma executa o build; seu PC não executa nada.
3. Crie um domínio HTTPS protegido por autenticação externa (por exemplo, uma camada Zero Trust). Um endereço público desprotegido **não é recomendado**.
4. Defina `REZ_DSH_PUBLIC_HOST` como **somente o hostname** publicado (por exemplo `dsh.example.com`), sem `https://`, caminho ou porta. Opcionalmente configure `PORT=3080`. Railway normalmente fornece `RAILWAY_PUBLIC_DOMAIN` como alternativa.
5. Configure um volume persistente montado em `/home/node/.dsh` (com permissão de escrita para UID 1000) para manter histórico e configurações. Sem volume, os dados podem ser perdidos após reinicializações.
6. Acompanhe os logs **privados**. O Harness imprime uma URL contendo um token de inicialização; esse token é uma credencial e **nunca deve ser publicado**.
7. Entre pelo domínio **somente após habilitar o controle de acesso** e configure o provedor em **Settings → Models**. Se usar a DeepSeek, defina `DEEPSEEK_API_KEY` nos segredos da hospedagem, ou use a interface de modelos para configurar uma credencial. Nunca faça commit de chaves.

### Limites reais

- O Dockerfile prepara um **servidor Node.js de longa duração**; Vercel Functions e Cloudflare Workers não executam esse processo.
- O modelo precisa de um provedor de inferência disponível. Harness é **orquestrador de agentes, não um modelo**; a hospedagem e a inferência podem ter custos.
- DSH pode executar código, ler arquivos e acessar a rede e segredos visíveis para seu processo. Use **ambiente isolado, somente para administradores**, permissões mínimas, workspace descartável e credenciais dedicadas. Não monte o repositório da REZ nem arquivos pessoais no workspace.
- O software upstream muda rapidamente; a versão npm foi fixada para evitar upgrades automáticos que quebrem a integração. Verifique licenças das dependências ao distribuir.
- **Ainda falta criar o serviço no painel da nuvem, configurar o domínio e testar.** Os arquivos de GitHub por si só não são um deploy.

Para integração futura com a experiência de chat da REZ, crie uma API administrativa autenticada e limitada sobre o SDK oficial (não exponha os métodos internos do Web UI ao visitante). Preserve o roteamento `Vercel → /api/brain → Cloudflare Worker` até a solução ter isolamento, autenticação e limites por usuário.

Documentação oficial: https://deepseek-harness.github.io/deepseek-harness/ e https://github.com/deepseek-ai/deepseek-harness/blob/master/SAFETY.md
