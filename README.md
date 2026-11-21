> **REZ v1.8 — CONHECIMENTO EMBUTIDO + HUGGING FACE DATASETS:** catálogo completo de 440 fontes e 23 feeds já incluído no site automaticamente, com 360 perguntas preparadas para avaliação. Pipeline CPU de Hugging Face Datasets e treinamento experimental de um classificador de assuntos; **o modelo de linguagem ainda não recebeu fine-tuning**. Consulte [documentação técnica e limites](docs/REZ_HF_DATASETS_TRAINING_V18.md). O Worker remoto Cloudflare continua aguardando ativação.

> **NOVA ARQUITETURA EM PREPARAÇÃO — REZ Brain Cloud:** frontend Vercel + modelo aberto GLM-4.7-Flash executado em Cloudflare Workers AI (binding sem chave de provedor), com streaming e sem consumir CPU/GPU do visitante na inferência. **O servidor Cloudflare ainda precisa ser autorizado e publicado na conta Cloudflare:** não confunda código implementado ou build bem-sucedido com IA em nuvem funcionando. Confira [instruções e limites de implantação](docs/CLOUDFLARE_BRAIN_SETUP.md). O modo local permanece disponível como opção manual.

> **REZ A.I v1.2 — MELHORIAS DE DESEMPENHO E COERÊNCIA:** prioridade à GPU de alto desempenho, alternativa CPU Qwen2.5 0.5B quantizada em 4 bits, proteção contra repetições e renderização agrupada. Continua sem chave de API. **A CPU pode gerar mais devagar**, mesmo com respostas melhores. [Detalhes e limites](docs/REZ_SPEED_QUALITY_V12.md).

> **REZ A.I v1.0 — INDEPENDENTE, 100% LOCAL, SEM CHAVE DE API:** esta é a versão ativa. WebLLM + Qwen2.5/SmolLM2 com GPU WebGPU em Web Worker, fallback CPU/WebAssembly com Transformers.js, memória de documentos no IndexedDB, busca local e exportação de histórico. **Não usa Moonshot, GroqCloud, Vercel AI Gateway ou qualquer endpoint de geração em nuvem.** O primeiro uso exige download dos pesos e execução com recursos do seu dispositivo. [Veja a arquitetura e os limites reais](docs/REZ_SOVEREIGN_V1.md).

> Os textos abaixo sobre Groq/NVIDIA/Kimi são históricos e **não descrevem mais a versão ativa**.

---

> **REZ Turbo v0.4 — Groq Free, sem cartão:** modo padrão com GPT-OSS 120B da OpenAI, em servidores GroqCloud. Não exige GPU ou pesos locais. Para ativar o chat, crie a chave gratuita **GROQ_API_KEY** no Groq e adicione-a como variável segura de ambiente na Vercel (Production), depois redeploy. Não envie chaves ao ChatGPT/GitHub. [Guia de configuração](docs/REZ_GROQ_FREE.md). O plano gratuito possui cotas e a hospedagem também tem seus próprios limites.

> **REZ TURBO v0.3 — modo padrão na nuvem sem pesos locais:** a REZ agora usa Nemotron 3.5 Lightning, 30B de parâmetros, por meio do Vercel AI Gateway. Modelo gratuito anunciado em novembro/2026, sujeito a limites e mudanças. Não é o ChatGPT. O histórico local fica no navegador, mas mensagens Turbo são enviadas à NVIDIA, que pode retê-las. **Consulte [a arquitetura e os avisos de privacidade](docs/REZ_TURBO.md).**

> **ATUALIZAÇÃO ATIVA — REZ LOCAL v0.2 (sem API paga):**
> A versão web agora gera texto no próprio navegador com **WebLLM + Qwen2.5 (WebGPU)** ou **Transformers.js + SmolLM2 (CPU/WASM)**. Não usa Moonshot/Kimi, OpenAI nem créditos por token. A primeira mensagem exige baixar pesos públicos para o dispositivo. A API Python, se usada, é apenas para Ollama local.
>
> **Como abrir:** acesse o site hospedado da REZ A.I, selecione o modelo e converse — sem terminal. Consulte [instalação, limitações, modelos e licenças](docs/REZ_LOCAL_OPEN_SOURCE.md).
>
> O restante deste README contém o histórico do projeto e **pode descrever arquiteturas anteriores**. A documentação da versão ativa é o link acima.

---

<div align="center">

# REZ A.I — Projeto de Inteligência Artificial Avançada 🤖

### Engenharia reversa responsável. Pesquisa aberta. Inteligência em evolução.

**Uma plataforma de IA híbrida construída para aprender com a pesquisa de ponta e evoluir com evidências.**

![Status](https://img.shields.io/badge/status-MVP%20em%20desenvolvimento-8b5cf6?style=flat-square)
![Version](https://img.shields.io/badge/version-0.3.0%20turbo-27272a?style=flat-square)
![Web](https://img.shields.io/badge/interface-Full%20Black%20Premium-050507?style=flat-square)
![Python](https://img.shields.io/badge/backend-Python%20%2B%20FastAPI-3776AB?style=flat-square)
![Next.js](https://img.shields.io/badge/frontend-Next.js-111111?style=flat-square)

[Visão](#-visão-do-projeto) · [Arquitetura](#-arquitetura-híbrida) · [Executar](#-executar-localmente) · [Pesquisa](#-pesquisa-e-engenharia-reversa) · [Roadmap](#-roadmap)

</div>

---

## 🌌 Visão do projeto

A **Rez A.I** é um projeto independente de pesquisa e engenharia de software para construir uma plataforma de inteligência artificial **híbrida, extensível e multiplataforma**.

Começamos com uma experiência de chat na web, um backend em Python e suporte a modelos **locais via Ollama** e **na nuvem via API**. O plano é avançar para memória, ferramentas, agentes, avaliações, aplicações móveis e experimentos com modelos abertos.

> **Nossa ambição:** levar a Rez A.I ao maior nível técnico possível por meio de engenharia reversa **de implementações e técnicas publicamente disponíveis**, experimentação e melhorias mensuráveis. Isso é uma meta de pesquisa — não uma afirmação de que o projeto já supera sistemas de fronteira.

## 🖤 Identidade

| | |
|---|---|
| **Projeto** | Rez A.I |
| **Conceito** | Assistente de IA híbrido, aberto à evolução |
| **Estilo visual** | Full Black Premium — preto profundo e acentos violetas |
| **Plataforma atual** | Aplicação web |
| **Plataformas futuras** | Android, iOS e desktop |
| **Criador** | [João Miguel](https://github.com/jmrzd) |

## ⚡ Estado atual — v0.1.0

**Já implementado no código inicial:**
- Interface de chat responsiva em Next.js, React e TypeScript;
- Criação, seleção e exclusão de conversas;
- Histórico armazenado localmente no navegador (`localStorage`);
- Backend FastAPI com endpoint de saúde (`GET /health`) e chat (`POST /chat`);
- Escolha manual de provedor: **Ollama (local)** ou **API da OpenAI (nuvem)**;
- Configuração de modelo local por variáveis de ambiente.

**Ainda não implementado:** autenticação, banco de dados, streaming, memória inteligente, RAG, agentes, seleção automática de modelos e treinamento. A integração completa ainda precisa ser validada em execução local.

## 🧩 Arquitetura híbrida

```mermaid
flowchart TD
    A[Pessoa usuária] --> B[Rez A.I Web · Next.js]
    B --> C[Rez Core inicial · FastAPI]
    C --> D{Provedor escolhido}
    D --> E[Ollama · modelo aberto local]
    D --> F[API na nuvem]
    B --> G[Histórico no navegador]
```

Na v0.1, **a escolha do modelo é manual**. O roteamento inteligente e o motor de agentes são propostas futuras. Consulte [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 🛠️ Tecnologias

| Camada | Tecnologia | Estado |
|---|---|---|
| Web | Next.js, React, TypeScript, CSS | Protótipo |
| Backend | Python, FastAPI, HTTPX | Protótipo |
| Modelos locais | Ollama (modelo configurável) | Integração inicial |
| Modelos na nuvem | API OpenAI | Integração opcional |
| Histórico | localStorage | Apenas local |
| Persistência | PostgreSQL | Planejado |
| Mobile | React Native | Planejado |

## 💻 Executar localmente

Requisitos: **Node.js 20+**, **Python 3.10+**, npm e, para IA local, [Ollama](https://ollama.com).

Clone usando o **nome real do repositório**:

```bash
git clone https://github.com/jmrzd/REZ-A.I.git
cd REZ-A.I
```

### Backend

```bash
cd backend
python -m venv .venv
```

Ative o ambiente virtual:

```bash
# Linux/macOS
source .venv/bin/activate
# Windows PowerShell
# .venv\Scripts\Activate.ps1
```

Instale e configure:

```bash
pip install -r requirements.txt
# Linux/macOS:
cp .env.example .env
# Windows PowerShell: Copy-Item .env.example .env
uvicorn main:app --reload
```

API: **http://localhost:8000** · Saúde: **http://localhost:8000/health**

### Modelo local — Ollama

Após instalar/iniciar o Ollama, em outro terminal:

```bash
ollama pull qwen3:1.7b
```

Esse é um **ponto de partida leve**; outros modelos podem ser configurados em `backend/.env` via `OLLAMA_MODEL` (por exemplo, uma variante de DeepSeek-R1 compatível com seu computador). O uso de cada modelo depende de memória, hardware e licença.

### Modelo na nuvem

Opcionalmente, defina `OPENAI_API_KEY` em `backend/.env`. **Nunca faça commit desse arquivo**. O backend mantém as chaves do lado do servidor.

### Frontend

Abra um segundo terminal na raiz do repositório:

```bash
cd frontend
npm install
npm run dev
```

Abra **http://localhost:3000**. Se a API não estiver em `localhost:8000`, configure `NEXT_PUBLIC_API_URL` no frontend.

## 🔬 Pesquisa e engenharia reversa

A Rez A.I pretende **estudar e reproduzir ideias permitidas pelas licenças** de projetos abertos, incluindo trabalhos das famílias **DeepSeek**, **Qwen** e **Kimi**, além de outras referências relevantes.

Eixos de investigação:
1. **Arquiteturas** — Transformers, Mixture of Experts, atenção e eficiência;
2. **Raciocínio e código** — avaliação de respostas, matemática e programação;
3. **Inferência** — quantização, desempenho local, latência e custos;
4. **Orquestração** — ferramentas, RAG, agentes e escolha de modelos;
5. **Avaliação reproduzível** — datasets permitidos, métricas e testes;
6. **Confiabilidade** — privacidade, resistência a prompt injection e segurança.

Pesquisa não equivale a copiar serviços fechados, contornar controles, obter pesos privados ou ignorar licenças. **Código público não é necessariamente software livre;** cada repositório, checkpoint e dataset exige verificação específica de seus termos.

Veja nosso [plano de pesquisa](docs/RESEARCH.md) e a [visão de funcionalidades](docs/PRODUCT_VISION.md).

## 🌐 Diferencial: Rez Universal Assistant

A experiência desejada não exige comandos rígidos nem repetir o nome da assistente em cada frase. A Rez deve compreender solicitações naturais **dentro de uma sessão ativa**, levar em conta o contexto e executar apenas ações permitidas.

> "Abre aí o Spotify, meu parceiro." → abrir Spotify.
>
> "Rez, abre o YouTube." / "Agora abre o Spotify também." / "Volta pra primeira aba." → reconhecer o contexto e, com integração de navegador autorizada, retornar à aba anterior.
>
> "Hey Rez, open my mail." / "Abre mi correo." → entender a intenção mesmo em outros idiomas.

**Hoje:** o OS Agent interpreta somente frases simples por regras, a partir de um terminal, e abre sites predefinidos. **Futuro:** NLU com modelos abertos, contexto de sessão, voz, integrações com navegador e aplicativos.

A implementação deverá diferenciar:
- **Modo texto:** comandos diretos sem chamar "Rez";
- **Ativação por voz:** "Hey Rez" e atalhos;
- **Conversa contínua (opt-in):** dispensar a palavra de ativação durante uma sessão delimitada;
- **Escuta contínua opcional:** somente com indicação visível, controle de microfone e proteção contra ativações acidentais.

📚 **Documentação detalhada**
- [Visão do produto e exemplos de interação](docs/PRODUCT_VISION.md)
- [Linguagem natural, contexto e voz](docs/NATURAL_LANGUAGE.md)
- [Integração Windows, Linux e navegadores](docs/OS_INTEGRATION.md)
- [Plugins, conectores e agentes](docs/PLUGINS_AND_AGENTS.md)
- [Privacidade, permissões e segurança](docs/SECURITY.md)
- [Plano de implementação e critérios de aceite](docs/ROADMAP.md)

## 🧠 REZ THINK + REZ MEMORY ENGINE

A Rez A.I pretende oferecer **níveis de raciocínio** (Instantâneo, Médio, Alto, Automático) e **níveis independentes de recuperação de memória** (Instantânea, Profunda, Extensa, Automática).

O objetivo de longo prazo é permitir lembrar conversas completas **entre chats autorizados**, com busca por palavras exatas, busca semântica, recuperação de decisões antigas e referência verificável à mensagem original. Histórico persistido não significa que o modelo recebe todas as mensagens simultaneamente nem garante memória perfeita.

**Estado atual:** o histórico da web existe apenas em `localStorage` de um navegador. **Ainda não existem** memória persistente entre dispositivos/contas, busca de conversas antigas ou seleção real de esforço de raciocínio.

- [Especificação detalhada do REZ MEMORY ENGINE](docs/REZ_MEMORY.md)
- [Especificação dos níveis REZ THINK](docs/REZ_THINK.md)
- [Arquitetura geral](docs/ARCHITECTURE.md) e [plano de entrega](docs/ROADMAP.md)

## 🗺️ Roadmap

- [x] Repositório e identidade Rez A.I;
- [x] Código inicial de interface **Full Black Premium**;
- [x] API de chat com seleção manual entre modelo local e nuvem;
- [ ] Testes de ponta a ponta e correções;
- [ ] Streaming e tratamento aprimorado de erros;
- [ ] PostgreSQL e sincronização segura de conversas;
- [ ] Contas, autenticação e limites de uso;
- [ ] Suporte a arquivos, busca e RAG;
- [ ] Memória com controles de privacidade;
- [ ] REZ MEMORY: histórico integral opt-in, busca lexical e semântica entre chats, citações, exportação e exclusão;
- [ ] REZ THINK: níveis Instantâneo/Médio/Alto/Automático com limitações e métricas transparentes;
- [ ] Benchmarks entre modelos abertos;
- [ ] Roteamento por qualidade, custo e latência;
- [x] OS Agent inicial para comandos fixos e abertura de URLs permitidas (teste manual reportado no Windows, sem validação automatizada em todas as versões);
- [ ] Linguagem natural para frases livres, gírias e idiomas variados;
- [ ] Contexto entre comandos, navegação de abas e aplicativos;
- [ ] Voz, ativação opcional e sessão conversacional;
- [ ] Plugins com permissões e conectores externos;
- [ ] Agentes e ferramentas especializadas;
- [ ] Aplicativos Android, iOS e desktop;
- [ ] Experimentos de fine-tuning, dentro dos recursos e licenças disponíveis.

## 🔐 Segurança e limitações

**MVP para ambiente local; ainda não está pronto para expor a internet pública.**

- Não armazene dados sensíveis nas conversas de teste (histórico no navegador).
- Não publique `.env`, credenciais, tokens ou chaves de API.
- Não configure chaves secretas com prefixo `NEXT_PUBLIC_`.
- Antes de lançar publicamente: autenticação, rate limiting, observabilidade, isolamento de ferramentas, validação de entradas e controles de custo.

## 📂 Estrutura

```text
REZ-A.I/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── style.css
│   ├── package.json
│   └── tsconfig.json
├── os-agent/
│   ├── agent.py
│   ├── tests/
│   └── README.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── RESEARCH.md
│   ├── PRODUCT_VISION.md
│   ├── NATURAL_LANGUAGE.md
│   ├── OS_INTEGRATION.md
│   ├── PLUGINS_AND_AGENTS.md
│   ├── SECURITY.md
│   ├── REZ_MEMORY.md
│   ├── REZ_THINK.md
│   └── ROADMAP.md
├── .gitignore
└── README.md
```

## 📜 Licença e atribuições

A licença **do código autoral deste repositório ainda será definida**; disponibilizá-lo publicamente não autoriza, por si só, reutilização irrestrita. Pesos/modelos/dados de terceiros possuem licenças próprias. **Rez A.I não é afiliada à DeepSeek, Qwen, Moonshot AI ou OpenAI.**

---

<div align="center">

**REZ A.I — Inteligência em evolução. Engenharia com propósito. 🖤**

Criado por [João Miguel](https://github.com/jmrzd)

</div>
