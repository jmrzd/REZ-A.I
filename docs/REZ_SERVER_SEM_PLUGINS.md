# REZ A.I — cérebro no servidor existente (sem plugins)

**Status:** código da branch de prévia. O motor REZ Avançado é executado pela função Node.js da **Vercel** e não exige Railway, instalação no PC, novo plugin, Docker, chave de provedor ou modelo pago.

## O que realmente funciona
- `GET /api/rez-agent`: saúde e descrição verificável do motor.
- `POST /api/rez-agent`: valida entrada, conversa, modo, limites e origem da requisição.
- `frontend/app/rez-serverless-agent.ts`: executa etapas determinísticas de até 3 perguntas explícitas, com respostas do motor nativo e fontes conhecidas.
- Pesquisa Wikipédia **apenas com opção explícita do usuário** e somente para resposta desconhecida, consultando somente a pergunta atual.
- O mesmo chat exibe `REZ Avançado`. No servidor não são executados comandos nem plugins; não há interface administrativa extra, nem downloads de pesos pelo visitante.
- O modo REZ Native permanece o padrão e os outros modos continuam disponíveis.

## Limitações honestas
**Isto não executa a distribuição completa do DeepSeek Harness.** Esse framework usa processo Node de longa duração e SDK com ferramentas/sessões, que não cabe em Vercel Functions. Esta alternativa compartilha a ideia de um fluxo de etapas, mas usa somente o código próprio da REZ e **não é um LLM generativo**. Não aprende de forma autônoma, não pode resolver qualquer assunto e não executa comandos do sistema. O site responde apenas enquanto a hospedagem está disponível e sujeito às cotas/limites da Vercel; não é um servidor dedicado sempre em execução.

A opção anterior de contêiner/SDK em `rez-agent-cloud` permanece apenas como proposta técnica inativa, sem serviço externo criado nem custo associado.

## Como publicar
A branch com o novo modo pode gerar **preview automático** na Vercel vinculada ao GitHub. Confirme a implantação `READY`, acesse o link da prévia, abra o modo `REZ Avançado` e teste uma pergunta sobre Python, SQL ou recursão. Mantenha **Vercel Authentication** ligada; este projeto não tem autenticação por usuário implementada internamente. Teste `GET /api/rez-agent` para verificar o motor.

## Segurança
O endpoint não oferece ferramentas de execução, acesso a segredos, terminal, sistemas de arquivos ou URLs arbitrárias. Limita tamanho e estrutura das requisições. O controle de cotas da hospedagem ainda é importante: não há rate limiting distribuído por usuário nesta implementação. Não publique como produto multiusuário antes de adicionar login e limites duráveis.

Nenhuma credencial existente, chave paga nem arquivo privado foi impresso ou transferido para o repositório.
