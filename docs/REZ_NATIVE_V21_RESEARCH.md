# REZ Native v2.1 — Respostas verificáveis, consulta opcional e melhor interpretação

## Problema resolvido

O print enviado mostrava a versão v1.9 (URL começando por rez-fdky627u6...), que ainda exige um Worker Cloudflare não configurado. A REZ Native v2.0 já substituiu essa dependência por um motor próprio determinístico no site. A v2.1 estende essa arquitetura sem chave comercial ou download de pesos de IA no navegador.

## Melhorias implementadas

- **Respostas verificáveis sob demanda:** para perguntas abertas que o motor nativo não conhece, o usuário pode **ativar explicitamente** a opção de pesquisa pública no painel Fontes. Nessa situação, o servidor busca o tópico na Wikipédia (português, inglês como alternativa) e apresenta um **pequeno trecho atribuído** e link para a página original.
- **Sem invenção:** artigos de desambiguação, títulos sem relação clara e extratos vazios são recusados. Erros e indisponibilidade do Wikimedia não são preenchidos com conteúdo fictício; a REZ retorna a resposta honesta de limitação.
- **Respostas rápidas por padrão:** perguntas que já são atendidas pelo REZ Native não fazem nenhuma solicitação adicional à Wikipédia, mesmo se o usuário optou pela pesquisa externa.
- **Privacidade:** a pesquisa externa fica **desativada por padrão**. Quando habilitada, apenas a pergunta atual (limitada a 120 caracteres) é enviada à Wikipédia; outros turnos, arquivos locais e dados da memória não são enviados ao provedor. O histórico de conversa continua no navegador.
- **Menos erros de intenção:** correspondência por palavra completa para siglas curtas, evitando que “aprender” seja interpretado como “DER”, e saudação isolada não captura perguntas mais longas iniciadas por “oi”.
- **Citações corretas na UI:** trechos realmente consultados aparecem identificados como Wikipédia; links do catálogo sem leitura continuam rotulados como referências sugeridas, nunca como fontes lidas.
- **Sem chave de IA, sem GPU local para o modo Native:** a versão realiza geração determinística de respostas no Next.js/Vercel. Não é LLM e não executa modelos generativos.

## Componentes

- `frontend/app/rez-native-core.ts`: regras de conhecimento, rótulos de método `guided`, `calculation`, `extractive`, `reference`, `fallback`.
- `frontend/app/rez-native-research.ts`: consulta às rotas fixas Wikimedia e extratos públicos, prazo máximo de 5 segundos.
- `frontend/app/api/rez-native/route.ts`: ativa busca externa exclusivamente com `allowPublicResearch: true` se o motor retornar `fallback`.
- `frontend/app/page.tsx`: envia a autorização expressa e mostra a origem correta.
- `frontend/app/NetworkKnowledgePanel.tsx`: descreve as opções Native/Cloudflare e o compartilhamento de dados.
- `frontend/tests/rez-native-research.test.ts`: pesquisas simuladas, exemplos reconhecidos, rejeição de desambiguação, privacidade e falhas de rede.

## Testes de aceitação

1. Acessar a **prévia atual** da REZ Native, não o endereço antigo v1.9.
2. Deixar **REZ Native** selecionado: perguntar "Me ajude a criar um projeto em Python". Deve responder sem Cloudflare e sem consulta externa.
3. Perguntar "Quem foi Ada Lovelace?": por padrão, a REZ deve declarar limite de conhecimento e/ou sugerir fontes, sem afirmar ter pesquisado.
4. Abrir **Fontes**, marcar a opção de pesquisa externa e repetir "Quem foi Ada Lovelace?". Se a Wikipédia estiver disponível, a REZ deve apresentar um trecho da página real com atribuição e link; se falhar, mostrar incerteza.
5. Perguntar sobre recursão com a pesquisa habilitada: resposta local imediata, sem necessidade de chamada ao Wikimedia.

## Limitações honestas

O novo modo não é um LLM, nem tem a capacidade de generalização de modelos treinados com grandes conjuntos de dados. A Wikipédia pode limitar acesso, ter erros ou mudar suas APIs. A busca não foi transformada em treinamento de pesos do modelo. O plano Vercel gratuito tem limites de execução; não há uso gratuito ilimitado garantido. Mantenha Vercel Authentication ativada para evitar abuso.

Documentação das rotas Wikimedia utilizadas: https://www.mediawiki.org/wiki/API:REST_API/Reference e https://www.mediawiki.org/wiki/Wikimedia_REST_API.
