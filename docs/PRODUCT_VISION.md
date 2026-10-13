# Visão do produto — REZ A.I

**Status deste documento: planejamento de produto, não lista de recursos existentes.**  
**Última revisão:** 2026-10-13.

## Missão

Construir a **Rez A.I**, um assistente de inteligência artificial híbrido, extensível e multiplataforma. Queremos que a pessoa usuária se comunique naturalmente, em vários idiomas, e que a assistente compreenda contexto, use ferramentas e aja no dispositivo **com consentimento, previsibilidade e segurança**.

A inspiração de capacidades inclui assistentes modernos (conversação, código, visão, arquivos, pesquisa, memória, voz, agentes, conectores), e o trabalho científico usa modelos/pesquisas abertos como DeepSeek, Qwen e Kimi, respeitando licenças. **Não temos acesso a pesos ou código proprietários.**

## Princípios

1. **Linguagem natural:** entender intenções, não exigir comandos decorados.
2. **Contexto útil:** acompanhar a sessão e resolver referências como "a primeira aba".
3. **Sem invocação repetitiva:** em texto basta pedir; na voz, uma sessão explicitamente iniciada permite continuidade sem repetir "Rez".
4. **Multilíngue:** português primeiro; inglês e espanhol desde o começo dos testes; outras línguas gradualmente.
5. **Universalidade modular:** adaptadores para Windows 10/11, Linux, navegadores e, futuramente, macOS e dispositivos móveis.
6. **Híbrido:** modelos locais e APIs externas intercambiáveis, sob políticas claras de privacidade.
7. **Extensível:** plugins, conectores, ferramentas e agentes com permissões específicas.
8. **Evidências, não promessas:** benchmark, documentação e testes antes de anunciar capacidades.

## Experiências de referência

| Pessoa usuária diz | Intenção interpretada | Resultado esperado quando a integração existir |
|---|---|---|
| "Rez, abre o Spotify." | abrir serviço/app | Spotify aberto |
| "Abre aí o Spotify, meu parceiro." | mesma intenção com gíria | Spotify aberto |
| "Só abre o Spotify" | mesma intenção sem dizer Rez | Spotify aberto em chat/sessão ativa |
| "Hey Rez, open my Gmail." | abrir e-mail | navegador abre Gmail |
| "Rez, abre mi correo." | abrir e-mail em espanhol | navegador abre Gmail se essa for a preferência configurada |
| "Abre o YouTube. Agora o Spotify também. Volta pra primeira aba." | sequência e referência contextual | abrir ambos, voltar à aba do YouTube se existir e estiver identificada |
| "Abre aquele app de música" | intenção ambígua | usar preferência autorizada ou perguntar qual app |
| "Fecha tudo" | ação potencialmente destrutiva/ambígua | pedir esclarecimento e confirmação, não agir cegamente |

**A Rez não precisa necessariamente ouvir o tempo todo.** Comandos digitados não exigem wake word. Para voz, diferenciar explicitamente ativação por palavra-chave, push-to-talk, sessão conversacional e escuta contínua opcional.

## Sistemas e experiências planejadas

- **Rez Core:** orquestração, compreensão, políticas e seleção de modelo.
- **Rez Language:** interpretação multilíngue de intenção, entidades e gírias.
- **Rez Context:** referências, ações recentes e estado de sessão.
- **Rez OS Agent:** execução local autorizada, via adaptadores por sistema operacional.
- **Rez Browser:** extensão para gerenciar abas sob permissões explícitas.
- **Rez Voice / Wake:** transcrição, síntese e modos de ativação.
- **Rez Plugins / Connect:** ferramentas e integrações externas.
- **Rez Memory:** preferências e contexto persistente opt-in, editáveis e removíveis.
- **Rez Vision / Files:** análise de imagens, PDFs e documentos.
- **Rez Code:** assistência de programação e testes isolados.
- **Rez Research:** pesquisa na web com fontes e atribuição.

## O que existe hoje

- Frontend Next.js e backend FastAPI para chat, com seleção manual entre Ollama e API na nuvem.
- Protótipo **OS Agent v0.1** executado no terminal, reconhecendo alguns comandos padronizados e abrindo URLs fixas em navegador.
- Teste manual de abertura de serviço no Windows relatado pelo criador; não é certificação de todas as versões do Windows.

## O que ainda NÃO existe

Entendimento irrestrito de linguagem, voz/wake word, conversa contínua, controle real de abas, controle geral do SO, memória semântica, agentes autônomos, plugins instaláveis, conectores oficiais e aplicativos móveis. Não afirmar essas funcionalidades como lançadas.

## Definição de sucesso

O usuário consegue formular um pedido natural, em idioma suportado, obter uma interpretação correta, conferir a ação relevante e vê-la executada com transparência. Para ambiguidades e riscos, a assistente pede confirmação. O progresso é medido por testes de intenção, recuperação contextual, segurança e compatibilidade.

Consulte [Roadmap](ROADMAP.md), [Linguagem natural](NATURAL_LANGUAGE.md) e [Segurança](SECURITY.md).
