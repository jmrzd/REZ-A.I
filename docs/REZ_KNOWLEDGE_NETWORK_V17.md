# REZ A.I v1.8 — Biblioteca de fontes, datasets e pesquisa na rede

## O que existe nesta versão

A REZ tem um **painel Fontes** dentro da interface, separado da memória de documentos. O painel funciona sem que o Worker de IA da Cloudflare esteja ativo. Ele oferece:

- Catálogo completo com **440 portais**, **33 categorias** e **23 links de feeds RSS** embutidos no site (sem coleta automática desses feeds).
- **440 links incluídos por padrão**, carregados de `frontend/public/rez-knowledge-catalog.json`. Importação JSON continua opcional para adicionar ou substituir por um catálogo personalizado no `localStorage`.
- Pesquisa pública via `/api/knowledge/search?q=...`. Essa rota chama somente **Wikipedia em português, Wikipedia em inglês e Crossref**, sem chave de API. Devolve títulos, pequenos trechos bibliográficos e links oficiais. Não baixa o texto inteiro das páginas.
- Resultados clicáveis, indicação da origem, ano de publicação quando informado pelo Crossref e mensagem quando algum provedor falha.
- Uma opção **desativada por padrão** para consultar fontes antes de cada resposta em modo Nuvem. Ao ativar, o termo pesquisado é enviado aos serviços Wikimedia e Crossref; os resultados são delimitados como fontes públicas não confiáveis antes de serem passados ao modelo remoto. Resultados aparecem também como links separados na conversa.
- O compartilhamento de trechos de documentos locais com o cérebro Cloudflare permanece desativado por padrão e exige autorização separada.

## Contagem do pacote ampliado

A versão de arquivo preparada para o usuário contém:
- 440 URLs únicas, distribuídas por 33 categorias.
- 23 feeds de notícias do ZIP original (não verificados individualmente).
- 360 perguntas de testes do ZIP original, **não são respostas nem fatos**.
- README, CSV, JSON e os arquivos originais preservados.

Importante: o catálogo completo está agora nos arquivos do site e o JSON original foi adicionado em `knowledge/data/rez-knowledge-full.json`. As 360 perguntas não contêm respostas: foram preparadas com Hugging Face Datasets para testes e classificação experimental de assuntos, **não para fine-tuning do LLM**. Leia `docs/REZ_HF_DATASETS_TRAINING_V18.md`. Os links não foram verificados individualmente ao vivo. Não afirmamos ter indexado toda a internet.

## Escopo real de conhecimento

Ter links **não significa que a IA treinou com eles**. O sistema não copia toda a internet, nem pode burlar paywalls, robots.txt, direito autoral ou privacidade. As únicas fontes consultadas automaticamente nesta primeira versão são Wikipedia e Crossref. Os 440 links oferecem um diretório categorizado para navegação, não indexação de conteúdo integral.

O código não implementa crawler geral nem coleta de dados pessoais. Para ampliar a busca com qualidade futuramente, adicione conectores específicos e juridicamente apropriados; preserve atribuição, limites e data de consulta.

## Segurança e privacidade

- Os destinos remotos são fixos no servidor para evitar SSRF.
- Os termos de busca são limitados a 140 caracteres; consultas possuem timeout e tratamento independente de erro por provedor.
- Respostas da internet são apenas metadados; seus textos podem estar incorretos, incompletos ou desatualizados.
- URLs importadas são validadas para evitar esquemas executáveis, links com credenciais e endereços de rede interna comuns.
- Conteúdo externo é escapado e delimitado como dados **não confiáveis** no prompt. Isso reduz, mas não elimina ataques por prompt injection.
- Consultas públicas enviam o termo pesquisado aos provedores de busca. Consultar fontes antes de responder é opcional e desativado por padrão.
- O cérebro na nuvem da REZ **continua dependendo da ativação separada do Cloudflare Worker**. Pesquisa de fontes e inferência por IA são funções diferentes.

## API

```text
GET /api/knowledge/search?q=algoritmos
```

Resposta esperada:

```json
{
  "query": "algoritmos",
  "results": [
    { "title": "...", "url": "https://...", "excerpt": "...", "provider": "Wikipédia", "kind": "enciclopedia" }
  ],
  "unavailable": [],
  "searchedAt": "..."
}
```

O exemplo é um esquema ilustrativo; não representa uma busca real.

## Fontes de referência e termos

- Wikimedia REST API: https://www.mediawiki.org/wiki/API:REST_API/Reference
- Wikimedia Action API e CORS: https://www.mediawiki.org/wiki/API:Cross-site_requests
- Crossref REST API: https://www.crossref.org/documentation/retrieve-metadata/rest-api/
- Common Crawl (corpus público, não ingerido): https://commoncrawl.org/
- IBGE Dados Abertos: https://www.ibge.gov.br/acesso-informacao/dados-abertos.html
- OpenAlex API: https://help.openalex.org/api/

O catálogo é expansível e os serviços podem impor limites ou alterar suas interfaces. Nenhum resultado deve ser apresentado como conteúdo lido integralmente sem consulta adicional.
