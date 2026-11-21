# REZ A.I v2.0 — REZ Native, motor próprio de conhecimento

## Construído

A REZ responde a perguntas cobertas sem Cloudflare, sem chave de API, sem baixar pesos de modelos e sem exigir a GPU do visitante. As respostas não triviais são processadas pelo próprio servidor Next.js/Vercel usando regras, exemplos originais, memória curta de conversa, matemática limitada e sugestões de fontes.

**Limite crucial:** este é um motor determinístico de conhecimento, NÃO um LLM treinado do zero. Não compete com um modelo generativo de propósito geral em perguntas abertas. Ele informa honestamente quando não sabe.

## Arquitetura

- frontend/app/rez-native-core.ts — lógica de conhecimento, classificação por regras, cálculos seguros, continuidade de conversa e exemplos personalizados.
- frontend/app/rez-native-examples.ts — projetos originais de Python, exemplos SQL, HTML e JavaScript.
- frontend/app/api/rez-native/route.ts — endpoint interno com validação de tamanho, papéis e origem. Não é uma API comercial.
- frontend/app/page.tsx — REZ Native é o modo padrão; Cloudflare e Local permanecem alternativas explícitas.
- frontend/public/rez-knowledge-catalog.json — 440 URLs e 23 feeds como metadados, NÃO páginas lidas.
- frontend/tests/rez-native.test.ts — regressões para prompts reais, privacidade e erros.

## Capacidades

- “Me ajude a criar um projeto em Python”: gerenciador de tarefas com persistência JSON, funções e entrada de usuário.
- “Quero uma calculadora”: código Python com operações e tratamento de erros.
- Recursão, return, listas/funções, SQL, PK/FK, JOIN, pandas, HTML e JavaScript.
- Continuidade de conversa para projetos Python, memória de nome informado no chat, cálculos binários sem eval e resumo extrativo.
- Alguns conhecimentos introdutórios de história, biologia, segurança e IA.
- Fora da cobertura: resposta transparente e sugestão de links sem alegar que o conteúdo deles foi lido.

## Privacidade e economia

- Perguntas são enviadas ao servidor do próprio site, e não ao Cloudflare ou a um serviço de IA comercial.
- Histórico continua no navegador. O REZ Native não tem banco de dados de conversas.
- Compartilhar trechos de documentos exige autorização na interface, desligada por padrão.
- A rota rejeita métodos/formato inválido e origem externa não autorizada; não executa programas enviados.
- O plano gratuito da Vercel possui limites de função, requisição e tráfego. Ausência de cobrança por token não significa recursos ilimitados.
- Mantenha Vercel Authentication habilitada até existir autenticação individual e controles de abuso suficientes.

## Como testar

No diretório frontend, execute npm install, npm test e npm run build. A versão de teste Vercel deve carregar o modo REZ Native por padrão.

GET /api/rez-native responde com online=true, generativeLLM=false, externalAI=false, usesVisitorGPU=false.
POST /api/rez-native aceita JSON com messages (role user/assistant) e mode (general/study/code/summary).

Envie “Me ajude a criar um projeto em Python”. Deve aparecer um exemplo de código funcional, não o erro de Cloudflare desconectado.

O modelo generativo de pesos abertos GLM-4.7-Flash só roda após ativação da conta Cloudflare e não faz parte do REZ Native.

## Para evoluir

Criar mais conhecimentos revisados, melhorar fontes e busca, ampliar exemplos e instrumentar testes de qualidade. Treinar um modelo de linguagem realmente novo requer dados licenciados, GPU e hospedagem de inferência: não é resolvido por um template ou um catálogo de links.
