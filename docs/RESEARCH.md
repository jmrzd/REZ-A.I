# Laboratório de pesquisa e engenharia reversa — Rez A.I

## Missão
Aprender com **pesquisas, modelos, checkpoints e códigos legalmente acessíveis** para criar capacidades próprias na Rez A.I. Não se trata de copiar um aplicativo fechado: a meta é entender princípios, reproduzir experimentos e medir ganhos.

## Famílias para estudo
| Referência | Questões de pesquisa | Fontes para iniciar |
|---|---|---|
| DeepSeek (V3, R1 e versões futuras verificadas) | MoE, inferência, raciocínio e RL | [Repositório DeepSeek](https://github.com/deepseek-ai) |
| Qwen | modelos menores, multilíngue, código e ferramentas | [Repositório Qwen](https://github.com/QwenLM) |
| Kimi / Moonshot | contexto, agentes e eficiência | [Organização Moonshot](https://github.com/MoonshotAI) |
| Outras implementações abertas | quantização, serving, RAG, agentes e avaliação | analisar projeto por projeto |

> **Atenção:** disponibilização pública, acesso a pesos e permissão de uso/derivação são coisas diferentes. Registrar licença e versão exata antes de reutilizar qualquer componente.

## Método de engenharia reversa responsável

1. **Coletar fontes primárias:** papers, model cards, código, licenças e notas técnicas públicas.
2. **Documentar hipóteses:** por que um componente pode melhorar nossa IA?
3. **Reproduzir legalmente:** implementar a técnica ou executar pesos cuja licença permita o uso.
4. **Comparar:** registrar baseline, hardware, versão, dataset, parâmetros e resultados.
5. **Revisar:** investigar falhas, qualidade, segurança e custo.
6. **Integrar apenas com evidências:** uma mudança só entra no Rez Core após testes.

Não tentaremos obter código/segredos internos, quebrar controle de acesso, extrair pesos não autorizados ou contornar termos de serviço.

## Benchmark inicial
Comparar modelos compatíveis com o hardware disponível em um conjunto versionado de tarefas em português e programação:

- Correção funcional de pequenos exercícios de Python e SQL;
- Fidelidade às instruções e respostas em português;
- Raciocínio matemático básico com respostas verificáveis;
- Respostas baseadas em contexto fornecido;
- Resistência a instruções maliciosas em documentos;
- Tempo até resposta, tokens por segundo, RAM/VRAM e custo.

Registrar **modelo exato, variante, quantização, temperatura, prompt, máquina, data e limitações**. Nunca afirmar superioridade com um teste isolado.

## Marcos de pesquisa
- **R0:** executar um modelo aberto no Ollama e validar o chat.
- **R1:** implementar harness de avaliação reproduzível.
- **R2:** comparar duas famílias de modelos com tarefas idênticas.
- **R3:** camada de roteamento de modelos baseada em métricas.
- **R4:** memória/RAG e ferramentas com testes de confiabilidade.
- **R5:** avaliar viabilidade de fine-tuning/LoRA com dados licenciados.

**Objetivo de longo prazo:** maximizar qualidade, autonomia e eficiência da Rez A.I, com transparência sobre o que realmente foi desenvolvido.
