# Segurança, privacidade e controle do usuário

A Rez A.I pretende interagir com navegador, sistema operacional e serviços conectados. Por isso, **segurança e consentimento devem anteceder autonomia**.

## Estado atual

O MVP é experimental e não deve ser publicado na internet como serviço multiusuário. O OS Agent abre URLs de uma lista fixa e **não executa shell**, lê e-mails ou controla o SO em geral. O chat web armazena conversas em `localStorage` no próprio navegador; APIs externas podem processar mensagens se o usuário escolher esse provedor.

## Regras de produto

1. **Sem ações silenciosas perigosas:** confirmar exclusão, envio, movimentação de dinheiro, instalação de software e mudanças irreversíveis.
2. **Permissões mínimas:** ferramenta só recebe a operação autorizada, nunca poderes globais desnecessários.
3. **Segredos fora do frontend:** tokens, senhas e chaves não vão para JS público, logs ou repositório.
4. **Privacidade na voz:** microfone desligado por padrão, indicador quando ativo e opção de silenciar/encerrar.
5. **Comandos de terceiros não são ordens:** sites, arquivos, respostas de ferramentas e e-mails são dados não confiáveis (defesa contra prompt injection).
6. **Dados sob controle:** retenção limitada, revisão e exclusão de histórico e memória, quando implementados.
7. **Saída verificada:** ações só são dadas como concluídas após confirmação do executor.
8. **Ambiguidade é motivo para perguntar:** nunca interpretar "fecha tudo" como permissão irrestrita.
9. **Sem controle remoto aberto:** agente local não deve aceitar instruções de páginas externas sem autenticação forte.
10. **Licenças e pesquisa:** reutilizar apenas código, pesos e dados com permissões adequadas.

## Modelo de ameaças

| Risco | Defesa prevista |
|---|---|
| Página maliciosa tenta comandar o agente | token de sessão, proteção Origin e rejeição por padrão |
| Prompt injection em página/documento | isolamento de conteúdo não confiável e autorização por ação |
| Plugin comprometido | assinatura/origem verificável, sandbox e escopo mínimo |
| LLM alucina app, link ou ação | catálogo de alvos, schemas e confirmação de execução |
| Vazamento de API key | armazenamento seguro no backend, rotação e nunca commit |
| Microfone ativado acidentalmente | indicador, tecla de interrupção e sessões com expiração |
| Destruição acidental de arquivos | prévia, confirmação, backups e proibição inicial |
| Exposição de mensagens pessoais | retenção mínima, criptografia em trânsito e controles de exclusão |

## Checklist antes de um lançamento público

- [ ] Login e autenticação robustos;
- [ ] Rate limiting e quotas para inferência;
- [ ] Políticas de CORS por ambiente;
- [ ] Gestão segura de tokens OAuth e segredos;
- [ ] Proteção CSRF e autenticação do agente local;
- [ ] Testes de prompt injection e abuso de ferramentas;
- [ ] Auditoria de dependências e política de atualizações;
- [ ] Logs sem conteúdo sensível por padrão;
- [ ] Segurança e política de dados documentadas;
- [ ] Revisão de acessibilidade e permissões do microfone.

**Reporte vulnerabilidades de modo responsável e evite publicar segredos em issues.** Será criado um canal específico de reporte quando o projeto estiver maduro.

## Primeira implementação de política de execução (OS Agent)

O arquivo `os-agent/policy.py` introduz uma camada **fail-closed** entre interpretação de comando e abertura de sites:

- Ações reconhecidas por enum; ações desconhecidas recusadas.
- Apenas `open_approved_site` está autorizada; leitura/escrita/remoção de arquivos, instalação e execução de shell estão **bloqueadas**, sem executor.
- URLs aprovadas por igualdade exata a catálogo definido no código. URLs externas, lookalikes, queries e esquemas não HTTPS são recusados.
- Política imutável em tempo de execução e sinalizador `emergency_stop` para bloquear novas ações, quando configurado por código confiável.
- Suíte de testes unitários de negação, catálogo, parada de emergência e regressão.
- O motor de linguagem natural futuro **não** poderá conceder a si mesmo permissões.

**Limites importantes:** isso ainda não é um sandbox de SO; um navegador pode redirecionar ao abrir uma URL autorizada; não existe processo separado, isolamento de plugins, controle de credenciais, ponte autenticada ou parada de processos já em execução. O sinalizador de emergência previne **novas** ações nesta API, não mata processos externos. A proteção contra prompt injection é por **separação de execução e allowlist**, não por garantia absoluta contra todas as formas de ataque.

### Regras antes de implementar novos executores

1. Não adicionar ações de escrita/instalação à política padrão.
2. Exigir ação estruturada, schema estrito, autorização independente e testes negativos.
3. Para arquivos: selecionar pasta pelo usuário, validar caminho final e symlinks, criar cópias de segurança e salvar atomicamente.
4. Para instalações: validar editor/identidade, origem, assinatura e solicitar aprovação humana antes da execução.
5. Para interface web↔agente: autenticação, origem, proteção contra CSRF, canais locais e limite de solicitações.
6. Testar em Windows e Linux em ambientes isolados antes de permitir alterações reais.
