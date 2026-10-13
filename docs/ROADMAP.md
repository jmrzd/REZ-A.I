# Roadmap técnico e critérios de aceite — Rez A.I

**Data de referência:** 2026-10-13. Planejamento evolutivo; não são datas de entrega.

## Status

- **Implementado no repositório:** código já versionado, mas não necessariamente validado ponta a ponta.
- **Teste manual reportado:** executado pelo criador em pelo menos uma máquina, sem matriz de ambientes.
- **Planejado:** ainda não existe no código.
- **Concluído:** só após critérios e testes serem registrados.

## Etapas

| Etapa | Entrega | Estado | Aceite |
|---|---|---|---|
| 0.1 Web | chat Next.js e FastAPI com Ollama/API | Código inicial | conversa real com modelo, erros e histórico testados |
| 0.1 OS Agent | abrir URLs permitidas por comando fixo | Código + teste manual Windows | executar suíte e validar em 10 e 11 |
| 0.2 Language | interpretar frases variadas PT/EN/ES | Planejado | suite de intenções com taxa de acerto registrada, negações sem execução |
| 0.3 Context | resolver referências a ações/abas | Planejado | sequência YouTube→Spotify→primeira aba, com extensão e IDs reais |
| 0.4 Voice | push-to-talk e wake word opt-in | Planejado | ativação e silenciamento confiáveis, indicador visível |
| 0.5 OS Bridge | integração web↔agente seguro | Planejado | autorização de sessão, rejeição de origem não autorizada |
| 0.6 Linux | adaptadores Linux por ambiente | Planejado | matriz de testes GNOME/KDE/Hyprland, X11/Wayland |
| 0.7 Plugins | registro/execução de ferramentas | Planejado | permissões e confirmação cobertos por testes |
| 0.8 Connect | OAuth e integrações | Planejado | escopos mínimos e revogação funcionais |
| 0.9 Memory | memória e preferências opt-in | Planejado | inspeção/exclusão/retensão verificadas |
| M1 Memory Archive | persistência integral e busca exata entre chats | Planejado | recuperar mensagem original e origem após reinício |
| M2 Memory Semantic | embeddings e recuperação com fonte | Planejado | benchmarks de recall e isolamento entre usuários |
| M3 Memory Controls | opt-in, exportação, correção, exclusão | Planejado | exclusão propagada a índices e caches |
| T1 Think Levels | Instantâneo/Médio/Alto/Automático | Planejado | modos testados contra capacidades do provedor e limites |
| T2 Think Auto | roteamento de esforço conforme tarefa | Planejado | comparar qualidade/latência e documentar fallback |
| 1.x | produto estável e multiplataforma | Visão | segurança, confiabilidade e documentação de releases |

Numeração acima é **proposta de marcos**, não versão prometida ou lançada.

## Backlog prioritário (primeiros passos)

1. Verificar build do frontend, backend e testes do OS Agent, com instruções de execução.
2. Registrar o ambiente de teste Windows 10/11 e capturar resultados.
3. Criar exemplos rotulados de linguagem natural e negações.
4. Implementar parser baseado em LLM com schema estrito, fallback e validação.
5. Desenvolver sessão de contexto e logs mínimos.
6. Construir extensão de navegador para identificação/foco de abas.
7. Ligar o agente ao backend somente com autenticação e confirmação.
8. Implementar voz com privacidade por padrão.
9. Expandir para Linux com adaptadores por compositor.
10. Criar registry de ferramentas, plugins e integração MCP.

## Qualidade mensurável

Para cada marco:
- testes automatizados com casos positivos, negativos, ambíguos e adversariais;
- medição de latência/uso de recursos (quando aplicável);
- verificação de permissões;
- documentação de plataformas efetivamente testadas;
- changelog/release sem confundir demonstrado com planejado.

## Links

[Visão](PRODUCT_VISION.md) · [NLU e contexto](NATURAL_LANGUAGE.md) · [OS](OS_INTEGRATION.md) · [Plugins](PLUGINS_AND_AGENTS.md) · [Segurança](SECURITY.md) · [Pesquisa](RESEARCH.md)

## Dependências de memória e raciocínio

Priorizar armazenamento local controlado e busca textual antes de busca vetorial e sincronização multiusuário. Segurança e consentimento precedem indexação persistente. Implementar métricas e validação de provedores antes de oferecer níveis de raciocínio funcionais. Especificações: [REZ MEMORY](REZ_MEMORY.md) e [REZ THINK](REZ_THINK.md).
