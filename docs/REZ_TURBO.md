# REZ Turbo v0.3 — Chat sem baixar modelo no PC

A REZ Turbo usa o modelo aberto **NVIDIA Nemotron 3.5 Lightning**, 30B parâmetros, executado em servidores da NVIDIA por meio do Vercel AI Gateway. **Não** é uma cópia ou engenharia reversa do ChatGPT; a REZ reproduz funcionalidades de chat com tecnologias disponíveis legalmente.

## Configuração

- Hospedado no projeto Vercel já existente.
- O AI SDK usa autenticação OIDC do Vercel automaticamente: nenhum segredo vai ao navegador e não é preciso criar chave Moonshot.
- A única rota de inferência na nuvem é frontend/app/api/chat/turbo/route.ts, com o modelo gratuito fixo nvidia/nemotron-3.5-lightning-free.
- O endpoint limita tamanho e quantidade de mensagens e tokens de saída. Não há fallback automático para modelos pagos.
- Os motores locais WebLLM e Transformers.js continuam como opções manuais.

## Custos e limitações

No catálogo da Vercel, em novembro de 2026, **entrada e saída do Nemotron Free custam $0 por token**. A promoção pode acabar, limitar requisições ou ficar indisponível. Hospedagem e banda possuem limites próprios. Não é promessa de gratuidade irrestrita.

**Importante:** a Vercel Authentication do site deve continuar ativada. A REZ ainda não tem login próprio nem limite de requisições persistente. Não deixe a API pública sem proteção.

## Privacidade

No modo Turbo, as mensagens são enviadas à NVIDIA por meio do AI Gateway. A NVIDIA pode reter prompts para melhorar seus modelos. Não envie senhas, chaves, dados financeiros ou informações privadas. O histórico da REZ continua armazenado no navegador.

## Sem ocupar RAM do usuário?

Não existe execução de IA sem memória: o modelo consome RAM/VRAM na infraestrutura do provedor, **não no computador do visitante**. O navegador só precisa de recursos para renderizar o chat e manter o histórico. Internet é necessária; os modelos locais podem ser selecionados quando desejado.

## Referências

- https://vercel.com/changelog/nemotron-3-5-lightning-now-available-on-ai-gateway-for-free
- https://vercel.com/ai-gateway/models/nvidia/nemotron-3.5-lightning-free
- https://vercel.com/docs/ai-gateway/authentication-and-byok
- https://github.com/openai/gpt-oss — exemplos de pesos abertos da OpenAI, diferentes do ChatGPT.
- [Arquitetura local](./REZ_LOCAL_OPEN_SOURCE.md)

## Validação

O build pode verificar compilação e contratos. Uma conversa real na nuvem só fica comprovada depois do deployment receber READY e de obter resposta pelo endpoint autenticado.