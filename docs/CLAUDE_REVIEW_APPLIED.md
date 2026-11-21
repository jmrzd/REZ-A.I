# REZ A.I v1.6 — Revisão da arquitetura Cloudflare

Esta atualização responde à auditoria de código realizada no Claude. **O servidor Cloudflare ainda não foi publicado:** o código e a prévia não equivalem a uma geração real funcionando.

## Alterações implementadas

**Segurança e cotas**

- Workers AI continua com o binding `AI`; não precisa de chave de API paga de inferência.
- O acesso ao Worker exige `REZ_BRAIN_SHARED_SECRET` privado (segredo de aplicação, não uma chave de provedor de IA).
- `USAGE_GATE` é um **Durable Object SQLite**, disponível em Workers Free, com contagem atômica antes de chamar o modelo. Um único objeto global aplica simultaneamente:
  - Máximo **60 solicitações gerativas por dia UTC** para toda a REZ.
  - Máximo **10 solicitações por minuto** para toda a REZ.
  - Máximo **12 solicitações por visitante por dia UTC**.
  - Máximo **3 solicitações por visitante por minuto**.
- O visitante é identificado pelo hash HMAC-SHA256 do IP calculado na ponte Vercel, usando o segredo interno. O IP bruto nunca é encaminhado ao Worker. Quando não há IP confiável, usa-se um mesmo identificador restritivo.
- Se o contador não estiver configurado, falhar ou negar uma solicitação, a IA **não é executada**.
- Os limites contam **solicitações**, não Neurons. Não constituem teto exato de custos, pois o consumo real depende de tokens e do modelo. A cota de **10.000 Neurons/dia do Workers Free** continua sendo aplicada pela Cloudflare.
- Mantenha **Vercel Authentication** habilitada! Ainda não há login individual, CAPTCHA nem proteção contra abusos suficiente para abrir o site ao público.

**Qualidade e contexto**

- Quatro modos na Nuvem: **Conversa**, **Estudos**, **Código** e **Resumo**.
- Limite máximo de saída por modo: **700 / 850 / 1000 / 850 tokens**, respectivamente. Modo Código mais longo gasta mais recursos.
- Prompt de sistema atualizado com respostas diretas, limites de confiança e regra explícita para documentos não confiáveis.
- Documentos: os trechos são delimitados em `<documentos>...</documentos>`, caracteres `<`, `>` e `&` são escapados e o modelo recebe instrução para não obedecer ordens contidas nos documentos. Isso reduz, mas não elimina, prompt injection.
- **Privacidade:** envio de trechos para a Nuvem **desativado por padrão**. A opção para compartilhar trechos fica em **Memória**, e precisa ser marcada pelo usuário. Documentos completos continuam no navegador.
- Histórico: turnos anteriores aos nove mais recentes são condensados em **extratos truncados** do texto antigo; isso não é resumo semântico feito pelo modelo e pode perder detalhes. Não há chamada adicional para resumir, preservando a cota.
- Respostas rápidas mencionam corretamente o motor Nuvem ou Local e incluem a pergunta "qual seu nome?". São respostas pré-programadas, indicadas na interface; não simulam a geração da IA.

## Configuração necessária para deploy

O passo a passo do projeto continua em `docs/CLOUDFLARE_BRAIN_SETUP.md`. O arquivo `cloudflare-brain/wrangler.jsonc` agora inclui:

```json
"durable_objects": { "bindings": [{ "name": "USAGE_GATE", "class_name": "UsageGate" }] },
"migrations": [{ "tag": "v1-usage-gate", "new_sqlite_classes": ["UsageGate"] }]
```

Ao publicar o Worker, essa migração cria o Durable Object SQLite e o binding necessários. Sem eles, o serviço recusa pedidos, não tenta gastar Neurons sem proteção.

É necessário manter a mesma senha aleatória `REZ_BRAIN_SHARED_SECRET` (32+ caracteres) como segredo no Worker e variável privada na Vercel, e cadastrar o endereço HTTPS do Worker em `REZ_BRAIN_URL` na Vercel. Não publique nem compartilhe esses valores.

O Worker ainda **não** está implantado pela integração da conversa; a ativação exige uma ação autorizada na conta Cloudflare. Não é necessário desativar proteção da Vercel nem contratar plano pago para construir/testar o código.

## Testes

- Testes automatizados do frontend: validação de mensagens, SSE, composição de documentos, consentimento, modos e limite.
- Testes de servidor simulam contador disponível, indisponível e cota ultrapassada sem gastar chamadas reais.
- CI da Cloudflare: TypeScript e `wrangler deploy --dry-run`, sem deploy de produção.
- Backend Python: suíte de regressão separada.

**Limitação dos testes:** não realizam inferência real do GLM-4.7-Flash nem prova de desempenho da nuvem; isso depende da conta Cloudflare conectada.

## Fontes da implementação

- Cloudflare Durable Objects em Workers Free: https://developers.cloudflare.com/durable-objects/platform/pricing/
- Durable Objects e SQLite: https://developers.cloudflare.com/durable-objects/get-started/
- Workers AI GLM-4.7-Flash: https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/
- Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
