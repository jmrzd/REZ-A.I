# REZ A.I — Cérebro hospedado (Cloudflare Workers AI)

## Objetivo

A REZ passa a ter um cérebro de inferência **no servidor**, com a interface Next.js hospedada na Vercel. Quando o modo **Nuvem** está habilitado, o navegador **não baixa pesos e não usa CPU/GPU local para gerar tokens**.

Nosso código controla a experiência de chat, a seleção do modelo, os testes, a memória de documentos, a validação e a conexão. O modelo de pesos abertos utilizado inicialmente é o **GLM-4.7-Flash**, executado na infraestrutura Cloudflare. **Não é um modelo treinado do zero pela REZ**.

A integração usa a vinculação interna Workers AI (`env.AI.run`) e **não precisa de chave de API de Moonshot, Groq, OpenAI ou Cloudflare AI**. A conexão privada entre o nosso site Vercel e o Worker **exige um segredo de segurança de aplicação**, diferente de uma chave paga de provedor de modelo.

## Situação de implantação

Os arquivos estão no repositório, mas **a IA no servidor só estará funcionando depois que o Worker for publicado e as duas configurações de ambiente forem feitas**. Um deployment READY na Vercel, sozinho, não representa inferência Cloudflare funcionando. O frontend mostra configuração indisponível e **não inicia automaticamente o modelo local**. Modo local só funciona por escolha explícita do visitante.

## Publicar sem terminal

1. Entre em https://dash.cloudflare.com e use uma conta no plano **Workers Free**. Não selecione Workers Paid nem ofereça cartão apenas para fazer o teste.
2. Vá em **Workers & Pages → Create → Importar repositório Git**. Autorize o GitHub e selecione `jmrzd/REZ-A.I`.
3. Configure a raiz do projeto como **`cloudflare-brain`**, nome do Worker **`rez-ai-brain`**, e escolha a branch **`feat/rez-server-brain-cloudflare`** como branch de implantação. O comando de publicação é **`npm run deploy`**. O arquivo `wrangler.jsonc` inclui a vinculação `AI`.
4. No painel de configurações do Worker, **Variables and Secrets**, crie um **Secret** chamado `REZ_BRAIN_SHARED_SECRET`. Valor: uma senha aleatória de **no mínimo 32 caracteres**, gerada em um gerenciador de senhas. Guarde-a em local privado; não cole em chats, prints ou código.
5. Confirme a publicação e copie o **endereço HTTPS real do Worker**, normalmente terminando em `.workers.dev`. A REZ não precisa de chave de provedor para chamar modelos pelo binding.
6. No projeto Vercel `rez-ai`, abra **Settings → Environment Variables** e configure as variáveis **Production**:
   - `REZ_BRAIN_URL`: endereço HTTPS real do Worker (sem `/chat`).
   - `REZ_BRAIN_SHARED_SECRET`: **o mesmo segredo** criado no Worker.
7. Faça o redeploy do frontend referente à branch `feat/rez-server-brain-cloudflare`, ou incorpore o pull request depois de revisar o código. **Mantenha Vercel Authentication ativada**.
8. Acesse `https://rez-ai.vercel.app`, selecione **Nuvem** e envie uma pergunta real. A UI utilizará `/api/brain`, que por sua vez encaminha a solicitação ao Worker. O servidor retorna as palavras em streaming.

Para verificar a implantação, `GET /api/brain` no projeto Vercel mostra somente `configured: true/false`, nunca a senha. Isso **não atesta a disponibilidade ou a validade** da conexão: uma resposta real só fica comprovada ao testar uma pergunta e receber texto.

## Segurança e privacidade

- O Worker exige **autorização de servidor para servidor** em todas as solicitações de geração. Não há CORS para visitantes chamarem diretamente.
- A Vercel faz uma chamada same-origin e mantém a senha de acesso exclusivamente nas variáveis de ambiente privadas do servidor.
- O endereço remoto é validado para HTTPS e domínio `.workers.dev` para reduzir riscos de SSRF.
- Limites por mensagem, por conversa e de tokens reduzem abuso, mas **não substituem controle de cota persistente**. Mantenha o frontend privado via Vercel Authentication até implementar login e rate limiting por usuário.
- O histórico continua em `localStorage` e os arquivos inteiros em `IndexedDB`, mas **a pergunta e trechos recuperados dos arquivos podem ser enviados ao Cloudflare Worker no modo Nuvem**. Não envie conteúdos confidenciais.
- A rota Cloudflare tem `Cache-Control: no-store` e evita registrar conteúdo de mensagens e segredos. Confira a política da Cloudflare para retenção e monitoramento operacional.
- O modo local continua disponível como alternativa manual, sem compartilhar perguntas com um serviço remoto de geração.

## Custo e desempenho

Em novembro de 2026, a documentação oficial oferece **10.000 Neurons/dia gratuitos** no Workers Free. Acima desse limite, o serviço para de responder até o reset; não há inferência gratuita ilimitada. A Cloudflare pode alterar modelos, planos e limites. O plano Workers Paid cobra uso adicional, então **não o ative** se a meta é custo zero.

Um Worker Cloudflare não executa os pesos dentro do processo do seu site; o modelo roda na plataforma de IA da Cloudflare. Isso evita downloads e o custo de inferência **no dispositivo do visitante**, mas não garante latência zero nem velocidade idêntica ao ChatGPT. A primeira resposta depende de rede e disponibilidade do provedor.

## Arquitetura

- `cloudflare-brain/src/index.ts`: validação e IA via binding, privado por segredo.
- `cloudflare-brain/wrangler.jsonc`: configuração de Workers AI sem API key de inferência.
- `frontend/app/api/brain/route.ts`: ponte protegida Vercel → Cloudflare.
- `frontend/app/cloud-ai.ts`: streaming no navegador sem carregar modelos.
- `frontend/app/page.tsx`: modo Nuvem padrão; Local alternativo manual.
- `frontend/app/knowledge.ts`: memórias locais e seleção de trechos.

## Fontes oficiais

- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/configuration/bindings/
- https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/
- https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/
- https://developers.cloudflare.com/workers/configuration/secrets/
