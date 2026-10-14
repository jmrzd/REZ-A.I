# Ponto de retomada — investigação Claude Desktop e REZ A.I

Data: 2026-10-13.

## Estado confirmado

- Repositório: `jmrzd/REZ-A.I`, branch `main`.
- Backend FastAPI com adaptadores Ollama e OpenAI, validação da API e seis testes unitários aprovados pelo usuário.
- Último `git status` mostrado pelo usuário antes da investigação: branch `main` sincronizada com `origin/main`, árvore limpa. Após commits remotos posteriores, executar `git pull` antes de continuar localmente.
- Documentação detalhada em `docs/research/claude-desktop-windows-2026-10.md`.
- Claude Desktop Windows atualmente observado na versão `2.37337.1.0`; análises mais antigas referem-se também à versão `2.31226.1`.
- Descobertos componentes Electron, workers, hosts MCP, recursos GitHub/Office 365, capacidades do manifesto Windows e aplicativos full-trust.
- A execução do script de extração/análise do `app.asar` chegou a `===== ANALISE CONCLUIDA =====` no Windows. O usuário **ainda não enviou** os relatórios para inspeção; não afirmar que seu conteúdo foi analisado.

## Artefatos locais no Windows (não versionados)

Pasta `%USERPROFILE%\Desktop\Claude-Research`:
- `asar-extraido\`: cópia extraída de arquivos empacotados do Claude (não publicar).
- `inventario.csv`: nomes e tamanhos.
- `arquivos-codigo.csv`: lista de arquivos de código.
- `mapa-arquitetura.csv`: correspondências de padrões como `ipcMain`, `ipcRenderer`, `contextBridge`, `BrowserWindow`, `mcp-runtime`, `sandbox`.
- `source-maps.txt`: listagem de mapas de código-fonte encontrados.
- `package.json`: cópia de metadados do pacote, se presente.

## Próxima ação ao retomar no Linux

1. No clone da REZ A.I, atualizar a branch: `git pull --ff-only origin main`.
2. Enviar ao chat **somente os relatórios** `inventario.csv`, `mapa-arquitetura.csv` e `package.json` do Windows, após revisar possíveis dados sensíveis e caminhos pessoais. Se os arquivos não estiverem no Linux, transferi-los manualmente ou gerar inventário equivalente a partir de uma instalação local autorizada.
3. Analisar os relatórios, localizar módulos-chave, distinguir evidência de hipótese e registrar conclusões sem copiar código proprietário, executáveis ou segredos para o GitHub.
4. Consolidar proposta de arquitetura REZ Desktop, depois seguir com streaming do backend e frontend.

**Segurança e escopo:** pesquisa estática, somente leitura, em instalação própria; não executar scripts extraídos, não coletar tokens/credenciais/conversas, não publicar código proprietário. Os commits anteriores estão no histórico do GitHub; o chat continua sendo o contexto da conversa, não foi exportado integralmente para o repositório.


## Diretriz permanente para transformar pesquisa em produto

Objetivo declarado do projeto: construir a **REZ A.I** com qualidade competitiva, usando investigação autorizada do Claude Desktop apenas como referência de arquitetura e experiência, **sem copiar código proprietário**.

Fluxo de trabalho:
1. Coletar observações técnicas por análise estática somente leitura da instalação autorizada.
2. Separar **evidência observada**, **hipótese não confirmada** e **recomendação de design**.
3. Documentar cada descoberta relevante no relatório de pesquisa.
4. Traduzir conceitos gerais para requisitos e implementações **originais** no frontend Next.js, backend FastAPI e futuro desktop.
5. Validar por testes e métricas (qualidade de respostas, latência, segurança, estabilidade, usabilidade); não afirmar superioridade sem comparação.
6. Nunca publicar código extraído, credenciais, dados pessoais ou outros materiais confidenciais.
7. Reportar ao usuário o **nome descritivo e SHA de cada commit** efetivamente realizado.

Áreas prioritárias: arquitetura Electron, comunicação IPC e contextBridge, isolamento de processos, integração MCP, workers, streaming, ferramentas com permissões, memória, UX e suporte Windows/Linux.

**Ponto de retomada atual:** Etapa 28 — script PowerShell fornecido para mapear referências a IPC, contextBridge, webContents, MessagePort, spawn e worker_threads nos arquivos extraídos do Claude Desktop 2.37337.1. **Aguardando saída do usuário**; ainda não há resultados da Etapa 28.
