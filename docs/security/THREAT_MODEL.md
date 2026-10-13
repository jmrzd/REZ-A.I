# REZ Security — modelo inicial de ameaças (proposta)

> **Estado:** planejamento técnico. Não representa funcionalidades de segurança já implementadas.  
> **Abrangência:** aplicação web Next.js/FastAPI atual, com expansão planejada para desktop Electron, ferramentas MCP, terminal e navegação.

## Princípio

Um usuário com controle da própria máquina pode ler, modificar ou instrumentar boa parte do software cliente. Portanto, **não existe garantia de impedir engenharia reversa local**. A segurança deve permanecer correta mesmo quando cliente, HTML, JavaScript ou chamadas HTTP sejam controlados por um atacante.

## Ativos e limites de confiança

| Ativo | Ameaça principal | Limite necessário |
|---|---|---|
| Chaves de API e tokens | Extração de segredos do frontend ou logs | Segredos apenas no servidor ou armazenamento do SO apropriado |
| Arquivos do usuário | Leitura ou modificação sem consentimento | Escopo explícito de diretórios, autorização em cada operação |
| Ferramentas de terminal | Execução arbitrária, vazamento de dados | Sandbox, permissões restritas, confirmações |
| Conversas e memória | Acesso cruzado entre usuários | Identidade autenticada e filtros por usuário no backend |
| Navegador | Prompt injection e navegação indevida | Conteúdo web tratado como não confiável; confirmação para ações sensíveis |
| Canal desktop ↔ backend | Chamadas forjadas, replay e escalada | Sessões, autorização no servidor, expiração e auditoria |
| Atualizações do desktop | Instalação de binários adulterados | Distribuição e atualizações assinadas, integridade verificável |

## Controles recomendados

1. **Backend como autoridade:** toda ação privilegiada exige autorização no servidor ou em serviço local confiável com política explícita; nunca confiar em flags enviadas apenas pelo frontend.
2. **Privilégio mínimo:** ferramentas operam com acesso necessário à ação específica, não como administrador.
3. **Consentimento humano:** pedir confirmação antes de alterar arquivos, executar comandos de impacto, enviar dados a terceiros, instalar programas ou fazer ações externas.
4. **Separação de processos desktop:** considerar `contextIsolation: true`, `nodeIntegration: false`, sandbox quando aplicável, preload estreito e IPC validado por origem/esquema; avaliar limites reais do Electron.
5. **Execução isolada:** limites de CPU, memória, tempo, diretórios e rede; diretórios temporários por tarefa; evitar interpretar respostas do modelo como comando de shell sem validação.
6. **Proteção de segredos:** tokens de curta duração; nunca embutir credenciais nos bundles; redigir tokens e dados pessoais dos logs.
7. **Memória:** controles de retenção, exclusão, autorização de acesso e separação de dados por identidade.
8. **Auditoria e alertas:** registrar decisões de autorização e falhas relevantes sem expor dados sensíveis.
9. **Testes:** verificar diretamente que pedidos não autorizados são recusados, mesmo com frontend modificado.
10. **Defesa contra prompt injection:** arquivos, resultados de busca e páginas web não podem conceder permissões nem substituir instruções de segurança.

## Primeiros testes de aceitação propostos

- Solicitação sem autenticação para endpoint protegido → recusada.
- Usuário A tentando acessar memória/arquivo de B → recusado.
- Ferramenta de leitura tentando acessar fora do diretório autorizado → recusada.
- Pedido de execução shell sem aprovação exigida → recusado.
- Página web com instrução para divulgar credenciais → tratada como dado, não como ordem.
- Tarefa que excede limites de recursos → encerrada e auditada.
- Token expirado/revogado → recusado.
- Cliente altera indicador visual de "autorizado" → decisão do backend permanece recusada.

## Critérios antes de publicar o agente desktop

- Revisão do desenho de IPC, permissões e superfícies de ataque.
- Testes automatizados dos controles acima.
- Rotação e revogação de tokens.
- Avaliação de logs e dados sensíveis.
- Atualizações assinadas e estratégia de resposta a incidentes.

## Relação com a pesquisa

O inventário do Claude Desktop está em [claude-desktop-windows-2026-10.md](../research/claude-desktop-windows-2026-10.md). O inventário **não é auditoria de segurança do Claude** e não permite afirmar que a REZ A.I seja mais segura. Uma comparação responsável requer escopo definido, implementação pronta e testes reproduzíveis.
