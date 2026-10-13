# REZ THINK — Níveis de raciocínio e orquestração

**Status:** especificação de produto; seletor e roteador ainda **não implementados**.  
**Diretriz:** oferecer **Instantâneo, Médio, Alto e Automático** como controle de esforço e tempo de processamento, quando o provedor oferecer mecanismos compatíveis.

## Modos propostos

| Modo | Uso principal | Estratégia possível | Limitação |
|---|---|---|---|
| **Instantâneo** | conversa cotidiana, abrir app, perguntas diretas | menos etapas, resposta curta, modelo de baixa latência | pode ser insuficiente para problemas longos |
| **Médio** | código, estudos, documentos | análise intermediária, ferramentas quando úteis | pode consumir mais tempo |
| **Alto** | arquitetura, depuração, tarefas complexas | planejamento, validação e testes adicionais | maior latência/custo, sem garantia de resposta correta |
| **Automático** | padrão recomendado | classificar complexidade e escolher orçamento dentro dos limites configurados | seleção pode precisar de correção manual |

**Não confundir:** mais tempo de inferência não aumenta necessariamente as capacidades base do modelo. Alguns provedores têm parâmetros nativos de esforço, outros exigem técnicas diferentes e alguns não oferecem controle real. A interface não deve fingir que um ajuste inexistente foi aplicado.

## Separação entre THINK e MEMORY

- **Think** define orçamento de raciocínio, estratégia de planejamento, número máximo de chamadas de ferramenta e verificação.
- **Memory** define profundidade da recuperação no histórico opt-in, não qualidade intrínseca de raciocínio.
- Ambos podem ser configurados independentemente, com opções `auto`.
- A escolha do modo nunca concede permissões extras ao OS Agent, plugins ou instaladores.

Exemplos:
- "Rez, abre Spotify": Think instantâneo, memória instantânea (ou nenhuma).
- "Analisa meus últimos três projetos": Think médio/alto, memória profunda.
- "Recupera todas as decisões sobre Rez nos últimos seis meses": Think alto, memória extensa com fontes e limites de busca.

## Proposta de contrato de API (futuro)

```json
{
  "provider": "local",
  "messages": [{"role": "user", "content": "Revise esse código"}],
  "reasoning_level": "high",
  "memory_level": "deep",
  "limits": {
    "max_tool_calls": 8,
    "timeout_seconds": 90
  }
}
```

**Exemplo ilustrativo, não compatível com o `POST /chat` atual.** O backend deverá validar enums e orçamentos; cliente não poderá ultrapassar limites do servidor.

## Fluxo proposto

1. Solicitação chega ao Rez Core autenticada.
2. Resolve modo solicitado ou automático, considerando tipo de tarefa e configuração de orçamento.
3. Memory Retrieval (se autorizado) retorna evidências, não comandos.
4. Adapta a execução às capacidades **reais** do modelo/provedor escolhido.
5. Se houver ações, aplica schemas e Security Engine antes de qualquer execução.
6. Faz verificações de resultado e responde com incerteza e fontes quando apropriado.
7. Registra métricas sem armazenar raciocínio privado ou dados pessoais desnecessários.

## Avaliação

- Benchmarks de tarefas idênticas entre níveis, por modelo e hardware.
- Latência p50/p95, tokens, custo, qualidade funcional, taxa de alucinações e confiabilidade das ferramentas.
- Restrições de tempo, preço e energia configuráveis.
- Não alegar "pensamento interno" ou acesso ao raciocínio privado de modelos comerciais.
- Testes de negação e autorização iguais em todos os modos.

## UI pretendida

Seletor no chat: **Instantâneo · Médio · Alto · Automático**. Exibir modo efetivo aplicado e opção de mudar no próximo pedido. Evitar mostrar "Alto" como efetivo quando o provedor não possui suporte/estratégia compatível. Preservar escolha por conversa quando o usuário permitir.

## Marcos

T0: testes e métricas para o chat atual; T1: schema e validação do modo; T2: controle de orçamento por provedor; T3: estratégia automática; T4: análise comparativa; T5: integração com Memory Engine.
