# REZ Turbo v0.4 — GroqCloud Free (sem cartão)

## Arquitetura ativa

O modo padrão da REZ A.I agora usa **GPT-OSS 120B**, modelo de pesos abertos da OpenAI, executado na **GroqCloud** por meio de uma API de inferência hospedada.

- Nenhum peso de modelo de dezenas de gigabytes é baixado no navegador.
- O PC/telefone só renderiza a interface. A Groq executa o modelo em hardware próprio.
- A aplicação web continua hospedada na Vercel.
- A REZ usa exclusivamente o endpoint fixo `https://api.groq.com/openai/v1/chat/completions`, com o modelo `openai/gpt-oss-120b`.
- Os modelos locais anteriores continuam opcionais e precisam de RAM/VRAM e download.
- Não usa Moonshot, Nemotron ou Vercel AI Gateway. Não há fallback automático para serviços pagos.

## Ativação em 5 passos (sem cartão)

1. Entre em https://console.groq.com/ e escolha o plano **Free**. Não faça upgrade para **Developer**.
2. Abra https://console.groq.com/keys e gere sua chave de API gratuita.
3. No painel Vercel do projeto **rez-ai**, abra **Settings → Environment Variables** e crie:
   - Name: `GROQ_API_KEY`
   - Value: sua chave real do GroqCloud (não o texto literal 'groq')
   - Target: **Production**
   - Sensitive/Encrypted: habilite, se o painel oferecer.
4. Em **Deployments**, faça **Redeploy** do último deployment Production após adicionar a variável; variáveis novas não são incorporadas retroativamente.
5. Abra https://rez-ai.vercel.app e selecione **REZ Turbo · GPT-OSS 120B (Groq)**. A página consulta o servidor e informa se a chave foi cadastrada. A mensagem de teste pode ser "Oi".

**Nunca envie a chave ao ChatGPT, em prints, em commits, ou para o frontend.** Ela fica somente na variável privada de servidor. Sem chave cadastrada, a página exibirá o motivo da indisponibilidade.

## Plano Free e limites

A documentação oficial do GroqCloud apresenta plano Free sem exigir método de pagamento (cartão é solicitado na atualização para Developer). Em novembro de 2026, o GPT-OSS 120B oferece limites de **30 requisições/minuto, 1.000 requisições/dia, 8.000 tokens/minuto e 200.000 tokens/dia**. Esses limites são de **uma organização Groq inteira** e podem mudar. Exceder as cotas resulta em erro HTTP 429, não em cobrança automática da conta Free. Não existe uso gratuito ilimitado, e os limites do plano Vercel são independentes.

Links oficiais:
- https://console.groq.com/docs/billing-faqs
- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/models
- https://console.groq.com/docs/api-reference
- https://console.groq.com/docs/reasoning

## Privacidade e segurança

- As mensagens Turbo são enviadas do servidor Vercel para a Groq. O histórico permanece em localStorage do navegador; o endpoint REZ não persiste conteúdo.
- A Groq declara não reter entradas e saídas de inferência por padrão, exceto em situações limitadas de funcionamento seguro, investigação de abuso ou recursos de retenção opt-in; consulte https://console.groq.com/docs/your-data e Data Controls.
- **Mantenha a Vercel Authentication/Deployment Protection habilitada**. A rota ainda não possui login próprio nem controle de frequência distribuído; a chave gratuita e a cota de tokens são compartilhadas entre todos os visitantes.
- A rota valida origem, tamanho de mensagem, número de mensagens e máximo de tokens; retorna erros claros de chave, cota, modelos e indisponibilidade. Nenhuma credencial é enviada ao navegador ou registrada no backend.
- O modelo GPT-OSS **não é o ChatGPT comercial**, e executar GPT-OSS não revela ou replica os pesos proprietários do ChatGPT.

## Verificação e depuração

- `GET /api/chat/turbo` mostra `configured: true/false` sem expor a chave; não confirma que ela é válida.
- `POST /api/chat/turbo` executa a inferência real e retorna SSE estruturado com eventos `delta`, `error`, `done`.
- Chave não cadastrada → 503 e instruções. Chave incorreta → erro de autenticação. Cota do Free atingida → HTTP 429 convertido em aviso claro.
- Após o deploy, confirme uma **resposta real** ao enviar uma mensagem pelo navegador autenticado. Build de produção e deploy Ready não substituem esse teste.

## Futuro

Antes de abrir a REZ publicamente, adicionar contas com autenticação, quotas individuais, proteção contra abuso, observabilidade e um plano operacional para limites de uso sem cartão.
