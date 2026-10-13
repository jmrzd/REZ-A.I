# Rez Plugins, Connect e Agents — especificação inicial

**Planejamento:** ainda não há infraestrutura real de plugins ou agentes autônomos no MVP.

## Visão

- **Rez Plugins:** catálogo de ferramentas instaláveis/ativáveis;
- **Rez Connect:** conectores para serviços (ex.: GitHub, Gmail, Google Drive, Calendar) usando APIs e OAuth;
- **Rez Agents:** execução de fluxos de trabalho em etapas, com verificação de resultados;
- **Rez Tools:** ações pequenas e determinísticas (ex.: `open_url`, `search_web`, `read_repo`);
- **Rez Core:** escolhe modelos, negocia capacidades e solicita autorização.

Estudar **MCP (Model Context Protocol)**, APIs REST e contratos de tool calling, sem depender exclusivamente de um provedor.

## Proposta de manifesto para plugins

```json
{
  "id": "rez.open_service",
  "version": "0.1.0",
  "description": "Abre serviços aprovados no navegador",
  "permissions": ["browser.open_approved_url"],
  "platforms": ["windows", "linux"],
  "requires_confirmation": false
}
```

Isto é apenas um **exemplo de design**, não um formato já suportado.

## Operações e consentimento

| Categoria | Exemplo | Política sugerida |
|---|---|---|
| Abertura simples | abrir Gmail | alvos permitidos, sem autorização administrativa |
| Leitura de serviço conectado | listar e-mails | consentimento OAuth e escopo mínimo |
| Escrita em serviço | criar rascunho | exigir permissão apropriada |
| Envio/alteração externa | enviar e-mail, publicar, alterar GitHub | confirmação antes de executar |
| Destrutiva | excluir arquivos/repositórios | confirmação reforçada e recuperação quando possível |
| Shell/código | executar script | sandbox, limites, revisão e proibição por padrão na máquina principal |

Conectar Gmail não significa permissão permanente para enviar e-mails. Cada ferramenta possui escopos de acesso separados.

## Ciclo de vida

1. Descoberta do plugin e origem confiável;
2. Revisão de manifesto, licença e integridade;
3. Consentimento para permissões;
4. Autenticação sem expor credenciais ao LLM;
5. Execução isolada com limites;
6. Resultado observável e auditável;
7. Revogação, desinstalação e exclusão de tokens.

## Agentes

Agentes dividem tarefas em passos, mas cada passo com efeitos externos precisa passar por política e autorização. Exemplos futuros:
- Inspecionar um repositório e propor um PR;
- Preparar rascunho de e-mail, sem enviar silenciosamente;
- Pesquisar documentos e sintetizar respostas com fontes;
- Organizar arquivos apenas após confirmação e prévia.

O agente não deve afirmar sucesso sem retorno confirmado da ferramenta.

## Roadmap

- P0: contrato `Tool` com `name`, `input_schema`, `permissions`, `execute`;
- P1: adaptador para `open_approved_url` do OS Agent;
- P2: registro e habilitação explícita de ferramentas locais;
- P3: fluxo de aprovação para operações sensíveis;
- P4: conectores OAuth e revogação de tokens;
- P5: suporte experimental a servidores MCP confiáveis;
- P6: SDK/loja de plugins somente depois de auditorias de segurança.
