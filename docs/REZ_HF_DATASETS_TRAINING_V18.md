# REZ A.I v1.8 — Conhecimento integrado + Hugging Face Datasets

## Entrega concreta

- **440 fontes de referência, 33 categorias**: `knowledge/data/rez-knowledge-full.json`, copiado do pacote que o usuário forneceu. O frontend serve uma versão enxuta em `frontend/public/rez-knowledge-catalog.json`. O painel **Fontes** carrega automaticamente esses links ao abrir; não é necessário importar JSON. O navegador pode continuar importando catálogos personalizados.
- **23 feeds RSS** cadastrados: o painel pode abrir seus links. **Não existe coletor RSS em execução**; a REZ não está lendo automaticamente as notícias desses feeds.
- **360 perguntas divididas em 18 categorias**: dados para experimentar a classificação de assunto e avaliar respostas. As perguntas **não têm respostas rotuladas**. Não devem virar pares pergunta-resposta inventados.
- **Hugging Face Datasets**: dependência opcional na pasta `training/`. Converte as fontes e perguntas em conjuntos `Dataset` / `DatasetDict` com divisão reprodutível treino, validação e teste. Não baixa nem copia o repositório `huggingface/datasets`: usa a biblioteca oficial instalada pelo pip.
- **Treinamento real, mas limitado**: o código treina um classificador leve de categorias de perguntas com scikit-learn, usando a biblioteca HF Datasets para preparar e carregar os dados. **Não altera os pesos do modelo de linguagem** nem melhora automaticamente sua capacidade geral. A classificação ainda é experimental e o artefato não é usado pela REZ hospedada.
- A pesquisa por **Wikipedia e Crossref** permanece separada: fornece metadados e trechos curtos sob demanda. O catálogo de links **não substitui** consultar o conteúdo de uma página.

## Executar preparação e o classificador (CPU)

No diretório raiz do repositório:

```bash
python -m venv .venv
. .venv/bin/activate
python -m pip install -r training/requirements.txt
python training/prepare_hf_datasets.py
python training/train_intent_router.py
```

No Windows, ative o venv com `.venv\Scripts\activate` em vez do comando de terminal Linux.

O pipeline cria em `training/build/`:

- `sources-metadata.jsonl` — fonte, categoria, idioma e URL; **não inclui páginas copiadas de terceiros**.
- `feeds-metadata.jsonl` — metadados de feeds, sem artigos.
- `questions-hf/` — `DatasetDict` dos 360 prompts com rótulo de categoria e divisões fixas treino/validação/teste.
- `manifest.json` — contagem, licenças da biblioteca, o que foi e não foi treinado.
- `models/rez-intent-router.joblib` — classificador de intenção treinado.
- `models/router-evaluation.json` — métricas sobre conjunto de teste separado.

Os modelos `joblib` serializados **devem ser carregados apenas de origens confiáveis**. Não aceitamos uploads de modelos serializados de terceiros.

## Verificar sem instalar localmente

O CI do GitHub executa o pipeline e salva um artefato temporário chamado **`rez-knowledge-intent-training`** com o manifesto, classificador e métricas. Ele utiliza CPU no GitHub Actions, não recursos do seu computador ou do navegador.

Acurácia do classificador deve ser consultada no relatório real; não há valor de desempenho garantido. A amostra contém apenas 360 perguntas e pode não representar usuários reais.

## Sobre fine-tuning de modelos de linguagem

`huggingface/datasets` é **uma biblioteca de dados, não um modelo de linguagem**. Não existe treinamento automático de GLM, Qwen ou qualquer LLM somente adicionando URLs e instalando o pacote.

Para treinar/adaptar um LLM de verdade, é preciso:

1. Escolher um modelo com licença que autorize a adaptação.
2. Usar textos ou exemplos **com licenças compatíveis**, qualidade revisada, consentimento e sem dados sensíveis.
3. Construir respostas corretas e auditáveis para as perguntas, incluindo separação treino/validação/teste.
4. Provisionar CPU/GPU e RAM adequadas para o método (como LoRA/QLoRA), armazenar os pesos adaptados e hospedar um serviço compatível.

**Nenhum desses passos foi executado na infraestrutura gratuita da Cloudflare nesta atualização.** O modelo GLM hospedado via Workers AI permanece sem fine-tuning. A ativação do Worker Cloudflare continua sendo uma etapa separada.

## Privacidade, limites e direitos

- As 440 URLs são metadados de diretório, **não uma coleta integral de conteúdos**. Não foram todas verificadas individualmente.
- O projeto Hugging Face Datasets é Apache-2.0, mas **cada dataset, artigo ou página de terceiros tem sua própria licença e condições**. A licença da biblioteca não autoriza copiar qualquer conteúdo da internet.
- A REZ não deve baixar automaticamente páginas com paywall, conteúdo protegido por direitos autorais, dados pessoais ou material proibido por termos de serviço.
- O painel de fontes fica disponível mesmo que o Worker de inferência ainda não esteja ativo; já a geração de respostas no modo Nuvem depende de uma publicação e configuração reais da Cloudflare.

## Referências

- Código: https://github.com/huggingface/datasets
- Documentação: https://huggingface.co/docs/datasets/
- Licença do código: https://github.com/huggingface/datasets/blob/main/LICENSE
- Conjuntos públicos (licenças individuais): https://huggingface.co/datasets
