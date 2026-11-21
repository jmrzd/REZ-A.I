# REZ A.I v1.9 — Confiabilidade e qualidade de conversa

## O que foi corrigido

A base v1.8 já tinha 440 fontes e o pipeline Hugging Face. Esta atualização corrige **problemas de execução**, não troca o modelo e não afirma desempenho superior sem medição real.

### 1. Streaming robusto

O cliente de texto `frontend/app/cloud-ai.ts` agora:

- Reconstrói SSE mesmo quando um evento é partido em vários pacotes, incluindo caracteres Unicode multibyte.
- Aceita eventos Chat Completions com `choices[].delta.content`, respostas do Workers AI com `response` e marcador `[DONE]`.
- Evita repetir o resultado quando uma resposta cumulativa chega depois dos pedaços já exibidos.
- Reconhece encerramento vazio, erros SSE, interrupção pelo usuário e timeout de 120 segundos.
- Impõe limites de tamanho por evento e no total gerado, sem mascarar erro HTTP 429 de cota.
- Continua mostrando texto à medida que chega; não é um fake streaming.

### 2. Segurança e continuidade de contexto

A montagem de mensagens preserva sempre as tags de fechamento dos blocos de **documentos** e **fontes públicas**, mesmo no limite de 3 mil caracteres por mensagem. Documentos e resultados externos permanecem delimitados como dados não confiáveis e com suas tags internas escapadas.

Conversas longas preservam um trecho abreviado do histórico antigo e as nove mensagens mais recentes. Isso **não é resumo semântico feito por modelo**, nem torna a memória ilimitada. Conteúdo potencialmente malicioso é tratado como referência, não como instrução.

### 3. Conexão com o cérebro REAL

A rota `GET /api/brain` não se limita mais a verificar se há duas variáveis de ambiente. Ela consulta `/health` no Worker por até quatro segundos, sem gastar Neurons, e informa:

- `configured: false, online: false`: variáveis de produção ausentes ou inválidas;
- `configured: true, online: false`: Worker configurado na Vercel, mas inacessível ou sem os bindings;
- `configured: true, online: true`: Worker acessível e declarando AI e USAGE_GATE configurados.

**Online não significa que uma inferência já foi comprovada.** O teste definitivo continua sendo uma mensagem aberta e resposta gerada na nuvem.

No frontend, um botão **Testar conexão** permite repetir essa consulta sem recarregar a página. O modo Nuvem não ativa silenciosamente modelos locais quando o servidor está offline.

### 4. Tests / regressão

Os testes agora simulam pacotes SSE divididos, acentos e emojis, dois formatos de resposta, duplicação cumulativa, erro HTTP 429, falhas do servidor e blocos de fontes/documentos próximos ao limite. A execução da CI continua incluindo build Next.js, Worker Cloudflare, testes Python e pipeline de avaliação Hugging Face.

### Situação da infraestrutura

**Ainda não existe implantação Cloudflare confirmada nesta sessão, nem REZ_BRAIN_URL ou REZ_BRAIN_SHARED_SECRET na Vercel do usuário.** Nenhuma mudança de código cria sozinha uma GPU gratuita ou realiza inferência remota. O projeto está preparado, mas exige a autorização do proprietário para conectar a conta Cloudflare e um segredo interno privado de acesso.

Não desligue Vercel Authentication enquanto não houver login de usuário e limites apropriados. O plano Workers Free e a disponibilidade de modelos e cotas podem mudar.

### Critério real para melhoria futura

Para dizer que a REZ ficou mais rápida ou inteligente, comparar o mesmo conjunto de perguntas, com o Worker realmente ativado, anotando:
- tempo até a primeira palavra e tempo total;
- % de respostas corretas e completas numa avaliação humana;
- repetição, alucinações, citações inválidas e interrupções;
- consumo diário de Neurons.

O projeto contém 360 perguntas categorizadas, **sem respostas gabaritadas**. Elas não são um benchmark automatizado de qualidade do LLM até que exista um gabarito validado.

## Referências

- [Cloudflare GLM-4.7-Flash](https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/)
- [Cloudflare Workers Free e modelos permitidos](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/)
- [Cloudflare Durable Objects SQLite](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Guia de conexão da REZ](CLOUDFLARE_BRAIN_SETUP.md)
