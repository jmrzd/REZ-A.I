# Pesquisa técnica — Claude Desktop no Windows

> **Status:** observação estática de pacote distribuído; não é código-fonte original e não demonstra o comportamento completo.  
> **Aplicativo observado:** Claude Desktop `@ant/desktop` versão `2.31226.1` (Windows, outubro de 2026).  
> **Projeto destinatário:** REZ A.I — pesquisa independente e reimplementações originais.

## Escopo e metodologia

A análise foi realizada pelo proprietário da instalação, no PowerShell, inspecionando nomes de arquivos e metadados do pacote Electron `app/resources/app.asar` por meio da ferramenta `@electron/asar`. Não foram modificados os arquivos instalados, nem acessadas credenciais, redes privadas ou mecanismos de autenticação.

Esta documentação registra **evidências observadas** separadamente de **hipóteses** e **decisões de projeto**. Não incluir código extraído, binários, chaves nem conteúdo proprietário no repositório.

## Evidências observadas

- Pacote Electron em `app/resources/app.asar` e diretório complementar `app.asar.unpacked`.
- Artefatos de build em `.vite/build` e múltiplas interfaces em `.vite/renderer`.
- Metadados do `package.json`: `name: @ant/desktop`, `version: 2.31226.1`, `main: .vite/build/index.pre.js`. Nenhum campo `type` e nenhum `scripts` exibidos no resultado consultado.
- Contagem reportada pelo terminal: **519 entradas no pacote**, **404 caminhos terminados em `.js`** e **0 caminhos terminados em `.map`**. A ausência de source maps refere-se **somente à listagem do app.asar**; não prova ausência deles em toda a cadeia de desenvolvimento ou em outros artefatos.
- Diversos `index.chunk-*.js` indicam código empacotado em chunks; não permitem identificar a função exata de cada chunk.

### Dependências declaradas no package.json

```text
@ant/claude-for-chrome-mcp
@ant/claude-native
@ant/claude-swift
@ant/computer-use-mcp
@ant/imagine-server
@loc/electron-window
https-proxy-agent
ws
```

Também foram encontrados caminhos contendo `node_modules/node-pty` e `node_modules/agent-base`. A presença no pacote não prova que uma biblioteca seja carregada em todas as sessões.

### Processos auxiliares e recursos encontrados por nome

```text
.vite/build/file-index-worker/fileIndexWorker.js
.vite/build/heavy-work-worker/heavyWorkWorker.js
.vite/build/msal-broker-worker/msalBrokerWorker.js
.vite/build/pty-host/ptyHostWorker.js
.vite/build/shell-path-worker/shellPathWorker.js
.vite/build/stall-sampler-worker/stallSamplerWorker.js
.vite/build/transcript-search-worker/transcriptSearchWorker.js
.vite/build/computerUseTeach.js
.vite/build/computerUseWatchRecord.js
.vite/build/coworkArtifact.js
```

Outros recursos observados em `app/resources`: `chrome-native-host.exe`, `claude-browser-shim.js`, `cowork-svc.exe` e `smol-bin.x64.vhdx`. **Não inferir execução, isolamento ou propósito definitivo apenas pelo nome.**

## Hipóteses que exigem validação

1. `ptyHostWorker` e `node-pty` podem participar de sessões de terminal.
2. `fileIndexWorker` e `transcriptSearchWorker` podem acelerar busca e indexação.
3. Dependências com sufixo `-mcp` sugerem integrações baseadas em Model Context Protocol.
4. `heavyWorkWorker` pode deslocar tarefas custosas para fora do fluxo principal da interface.
5. `ws` permite comunicação WebSocket, mas seu uso efetivo e destino não foram confirmados.

Nenhuma dessas hipóteses implica acesso a pesos de modelos, memória global, código-fonte TypeScript original ou arquitetura dos servidores da Anthropic.

## Lições para REZ A.I — decisões propostas, ainda não implementadas

- **Web atual:** manter Next.js/React e FastAPI; não migrar o MVP apenas porque outro produto utiliza Vite.
- **Desktop futuro:** avaliar Electron + Vite como uma opção, com processo principal mínimo e interfaces sem privilégios.
- **REZ Browser/Computer Agent:** contratos de ferramentas explícitos, concessão de permissões por ação, origem confiável, consentimento e trilha de auditoria.
- **REZ Code Agent:** terminal isolado, diretórios delimitados, restrições de rede e política de aprovação de comandos.
- **REZ Memory:** indexação e busca separadas do caminho crítico da interface, com isolamento por usuário e regras de retenção.
- **Workers:** considerar processos auxiliares para indexação, busca e tarefas CPU-bound; medir antes de adotar.
- **Segurança:** não embutir chaves secretas ou regras de autorização exclusivamente no cliente. Ofuscação não substitui segurança do backend.

## Continuação da investigação

- Inventariar interfaces em `.vite/renderer` e entradas de build, apenas por caminhos e metadados.
- Inspecionar documentação pública do MCP, Electron e node-pty para implementação própria.
- Comparar riscos entre Electron e web quanto a IPC, permissões, sandbox, atualizações e persistência.
- Criar protótipos próprios com testes automatizados e avaliações de segurança.
- Separar sempre **observado**, **inferido** e **implementado/testado**.

## Reprodutibilidade: leitura somente

Exemplo de comandos PowerShell para listar sem extrair ou alterar arquivos:

```powershell
$claude = (Get-AppxPackage -Name "Claude").InstallLocation
$asar = Join-Path $claude "app\resources\app.asar"
$arquivos = @(npx.cmd --yes @electron/asar list $asar)
"Entradas: $($arquivos.Count)"
"JavaScript: $(($arquivos | Where-Object { $_ -match '\.js$' }).Count)"
"Source maps no ASAR: $(($arquivos | Where-Object { $_ -match '\.map$' }).Count)"
```

**Ética e propriedade intelectual:** pesquisa para interoperabilidade, aprendizagem e design original; não redistribuir arquivos do fornecedor, código proprietário, credenciais nem contornar licenciamento ou controles de acesso.


## Segunda rodada — interfaces, workers e módulos nativos

**Origem:** saída PowerShell do pacote instalado, versão `2.31226.1`. Contagens são dos caminhos apresentados pelo comando de filtragem, não de todos os componentes do produto.

### Seis interfaces HTML identificadas

```text
.vite/renderer/about_window/about.html
.vite/renderer/buddy_window/buddy.html
.vite/renderer/find_in_page/find-in-page.html
.vite/renderer/local_exec_consent/localExecConsent.html
.vite/renderer/main_window/index.html
.vite/renderer/quick_window/quick-window.html
```

A interface `local_exec_consent` **sugere** um fluxo de consentimento para execução local, mas nomes de arquivos não demonstram que esse fluxo seja obrigatório, completo ou resistente a ataques.

### Oito arquivos de worker apresentados

```text
.vite/build/file-index-worker/fileIndexWorker.js
.vite/build/heavy-work-worker/heavyWorkWorker.js
.vite/build/msal-broker-worker/msalBrokerWorker.js
.vite/build/pty-host/ptyHostWorker.js
.vite/build/shell-path-worker/shellPathWorker.js
.vite/build/stall-sampler-worker/stallSamplerWorker.js
.vite/build/transcript-search-worker/transcriptSearchWorker.js
node_modules/node-pty/lib/worker/conoutSocketWorker.js
```

### Seis arquivos binários em app.asar.unpacked

| Nome | Extensão | Tamanho observado (bytes) |
| --- | --- | ---: |
| claude-native-binding.node | .node | 3.755.856 |
| conpty.node | .node | 312.144 |
| conpty_console_list.node | .node | 155.472 |
| github-mcp-server.exe | .exe | 20.566.352 |
| msal-node-runtime.node | .node | 365.904 |
| msalruntime.dll | .dll | 3.261.536 |

`conpty` sugere integração com pseudo-terminal do Windows; `github-mcp-server.exe` sugere um componente para integração GitHub/MCP; `msal` sugere autenticação Microsoft. São **inferências a partir de nomes**, não comprovação de execução ou controles internos.

### Ideias de implementação original na REZ

1. Janela de consentimento para operações locais sensíveis, vinculada a autorização efetiva no serviço de ferramentas.
2. Terminal com escopo limitado e aprovação por operação; não confiar na confirmação visual do frontend como única barreira.
3. Adaptadores MCP independentes, com permissões mínimas por integração.
4. Workers separados para indexação, busca e tarefas pesadas, conforme métricas de desempenho.
5. Testes de segurança para pedidos de execução sem consentimento, caminhos fora de escopo e instruções maliciosas vindas de ferramentas.

**Nenhum código ou binário do Claude deve ser incorporado à REZ.** Próximos estudos podem usar metadados, comportamento documentado e bibliotecas de código aberto sob suas licenças.


## Terceira rodada — assets de interfaces e executáveis auxiliares

**Fonte:** listagem PowerShell de caminhos de `app.asar` e metadados `VersionInfo` dos arquivos `.exe` da instalação Windows.

### Arquivos relevantes nas interfaces

```text
.vite/renderer/local_exec_consent/assets/main-BdelVSAW.js
.vite/renderer/local_exec_consent/localExecConsent.html
.vite/renderer/main_window/assets/MainWindowPage-Oioe5_Mq.js
.vite/renderer/main_window/assets/MainWindowPage-yE7nSc5c.css
.vite/renderer/main_window/assets/attachReactWithSelector-Bjnpmd0U.js
.vite/renderer/main_window/assets/clawdQuestEngine-B9DWL_V0.js
.vite/renderer/main_window/assets/clawdQuestEngine-C2Z1JudX.css
.vite/renderer/main_window/assets/main-BvLmXOuS.js
.vite/renderer/main_window/assets/react-intl-CDLd1RMZ.js
.vite/renderer/main_window/index.html
.vite/renderer/quick_window/assets/main-BLWA8RtE.js
.vite/renderer/quick_window/assets/main-CiwjW8Wn.css
.vite/renderer/quick_window/quick-window.html
```

Os arquivos sugerem bundles específicos por janela e uso de tecnologias React/intl; a mera existência dos nomes não comprova a composição original, fluxo de consentimento nem o funcionamento do `clawdQuestEngine`.

### Executáveis observados

```text
chrome-native-host.exe
claude-ssh-askpass.exe
claude-ssh-broker.exe
claude-ssh-proxy.exe
cowork-svc.exe
github-mcp-server.exe
```

Na saída consultada, os campos `VersionInfo.CompanyName` e `VersionInfo.FileDescription` estavam vazios. Portanto, não atribuir funções exatas nem garantias de segurança com base nesses campos.

### Aplicações planejadas para REZ A.I

- **REZ Consent UI:** janela de confirmação com descrição clara da ação, escopo e resultado; a autorização real deve ser validada por serviço confiável.
- **REZ Desktop Shell:** janela principal e janela rápida com isolamento de contexto e IPC de superfície mínima.
- **REZ Browser Bridge:** integração com navegador por API/extension oficialmente documentada, sem conceder permissões globais.
- **REZ GitHub Tool Adapter:** integração MCP com permissões por repositório, usuário e operação, sem expor tokens no renderer.
- **REZ Terminal/SSH:** autenticação e autorização explícitas; credenciais no armazenamento adequado do sistema; evitar execução irrestrita.
- **REZ UX modular:** assets por janela, internacionalização e carregamento seletivo quando medido como vantajoso.

**Próximas verificações:** consultar licenças e documentação pública de bibliotecas; testar arquiteturas originais com limites de confiança, sem extrair/reutilizar código privado. Não afirmar superioridade de segurança sem testes.


## Quarta rodada — assinaturas digitais Authenticode

**Fonte:** comando PowerShell `Get-AuthenticodeSignature` executado localmente sobre arquivos `.exe` encontrados em `app/resources` do Claude Desktop para Windows.

| Arquivo | Status reportado | Sujeito do certificado |
| --- | --- | --- |
| chrome-native-host.exe | Valid | Anthropic, PBC |
| claude-ssh-askpass.exe | Valid | Anthropic, PBC |
| claude-ssh-broker.exe | Valid | Anthropic, PBC |
| claude-ssh-proxy.exe | Valid | Anthropic, PBC |
| cowork-svc.exe | Valid | Anthropic, PBC |
| github-mcp-server.exe | Valid | Anthropic, PBC |

O campo `SignerCertificate.Subject` continha `CN="Anthropic, PBC", O="Anthropic, PBC", L=San Francisco, S=California, C=US`, além de atributos do registro corporativo. O status `Valid` foi reportado para **todos os seis executáveis verificados**. O teste não cobriu todos os arquivos do aplicativo, nem o comportamento dos executáveis.

### Lição para REZ A.I

- Assinar os binários distribuídos para Windows usando uma identidade de publicação apropriada.
- Verificar assinatura, procedência e integridade das atualizações antes de instalá-las.
- Definir processo de publicação e resposta a comprometimento de chaves.
- Testar rejeição de atualizações adulteradas ou não assinadas.
- Evitar conclusões exageradas: **assinatura válida não é prova de ausência de vulnerabilidades**.

### Próximos testes não invasivos

- Consultar os metadados de assinatura do executável principal e manifesto MSIX/Appx.
- Investigar a política de atualização do próprio projeto REZ a partir de documentação oficial de Electron/Windows.
- Construir um protótipo próprio de verificação de atualização assinada, com testes de adulteração.


## Quinta rodada — assinatura do executável principal

O usuário executou `Get-AuthenticodeSignature` para o caminho `$claude/app/claude.exe`. A saída do PowerShell reportou:

- `Status: Valid`
- `SignerCertificate.Subject`: `CN="Anthropic, PBC", O="Anthropic, PBC", L=San Francisco, S=California, C=US`, com atributos adicionais de registro corporativo.

O comando `Get-AppxPackage -Name "Claude" | Select-Object Name, Version, Publisher, SignatureKind, IsFramework` **não exibiu uma linha de identidade do pacote** na saída fornecida. Não inferir daí a versão atual, a identidade do publisher do pacote, nem a causa da ausência.

**Aplicação na REZ:** para o futuro instalador desktop, adotar assinatura digital e verificação de integridade de binários e atualizações. Isso é uma meta de engenharia, não uma funcionalidade já implementada. Assinatura válida não prova ausência de vulnerabilidades nem comprova isolamento dos processos.


## Sexta rodada — árvore de processos em execução

**Fonte:** saída local de `Get-CimInstance Win32_Process` filtrada por `Claude|cowork|github-mcp`, com colunas `ProcessId`, `ParentProcessId` e `Name`. Fotografia de um único momento, não uma descrição de todos os processos possíveis.

- `claude.exe` PID **11736**, pai **2268**.
- Sete processos `claude.exe` filhos de **11736**: **24820**, **15508**, **22208**, **11672**, **24988**, **21708** e **7384**.
- `cowork-svc.exe` PID **5880**, pai **828**; o pai não aparece no conjunto filtrado.
- **Nove processos** correspondentes ao filtro no momento da coleta. Nenhum processo `github-mcp-server.exe` apareceu nessa fotografia; isso **não prova** que o recurso não seja utilizado em outras situações.

A relação pai/filho demonstra a organização de processos observada, mas **não identifica papéis de renderer, GPU, network service ou utility**. A presença de `cowork-svc.exe` com outro pai também não comprova independência arquitetural ou isolamento de segurança.

### Aplicações na REZ A.I

- Separar a UI, o núcleo de ferramentas e os workers por limites de confiança e necessidade de desempenho.
- Documentar o ciclo de vida de processos e as permissões de IPC antes de implementar a versão desktop.
- Testar encerramento seguro de processos auxiliares, recuperação de falhas e limites de recursos.
- Instrumentar métricas de CPU/memória por processo, sem coletar conteúdos privados de usuários.

### Próxima coleta não invasiva

Consultar `CommandLine` dos processos **somente localmente**, pois argumentos podem conter caminhos pessoais ou tokens. Antes de compartilhar qualquer saída, remover dados sensíveis. Preferir inicialmente extrair apenas marcadores `--type=` e `--utility-sub-type=` quando presentes, sem publicar a linha completa.


## Sétima rodada — tipos de subprocessos Electron/Chromium

**Fonte:** consulta local `Win32_Process.CommandLine` com extração restrita de `--type=` e `--utility-sub-type=`; a linha de comando completa não foi compartilhada.

| PID | `--type` observado | `--utility-sub-type` observado |
| --- | --- | --- |
| 11736 | ausente; principal ou não identificado | — |
| 24820 | crashpad-handler | — |
| 15508 | gpu-process | — |
| 22208 | utility | network.mojom.NetworkService |
| 11672 | renderer | — |
| 24988 | renderer | — |
| 21708 | utility | video_capture.mojom.VideoCaptureService |
| 7384 | utility | audio.mojom.AudioService |

**Conclusões sustentadas:** foram observados dois renderers, um processo GPU, um handler de falhas e serviços auxiliares Chromium de rede, captura de vídeo e áudio, além de um processo sem marcador `--type`. A saída é um instantâneo; não revela a comunicação IPC, as permissões de cada processo nem a atividade efetiva dos serviços. Em particular, a presença de `VideoCaptureService` não demonstra que haja gravação ativa.

**Aplicação na REZ A.I:** documentar separação de responsabilidades na futura versão desktop; manter renderers sem privilégios desnecessários; validar IPC; isolar agentes e acesso a arquivos; solicitar consentimento explícito para microfone/câmera/captura de tela; testar recuperação de falhas. Esses controles são objetivos de implementação, não recursos já presentes no MVP web.

**Próxima investigação segura:** mapear APIs e padrões documentados de Electron (processo principal, renderer, preload, IPC, sandbox) e projetar um protótipo original com testes de autorização.


## Oitava rodada — caminhos relacionados a IPC, entradas de build e comunicação

**Fonte:** listagem local de caminhos do `app.asar` com filtros por nome; os resultados foram truncados em 35 ou 30 itens conforme os comandos.

- O filtro `ipc|preload|bridge|channel|message` encontrou somente `node_modules/ws/lib/permessage-deflate.js`, por conter a palavra `message`. **Não foi identificado um arquivo de IPC pelo nome**, o que não demonstra ausência de IPC no aplicativo.
- Entre os arquivos diretamente sob `.vite/build` observados: `aboutWindow.js`, `buddy.js`, `claudePagePreview.js`, `computerUseTeach.js`, `computerUseWatchRecord.js`, `coworkArtifact.js`, `designWindow.js`, `findInPage.js` e diversos `index.chunk-*.js`.
- Dependências e módulos observados: `node_modules/agent-base`, `node_modules/ws` (incluindo `websocket-server.js`, `receiver.js`, `sender.js`, `permessage-deflate.js`) e `node_modules/node-pty/lib/windowsConoutConnection.js`, `windowsPtyAgent.js`, `windowsTerminal.js`.

### Interpretação e limites

A presença de `ws` comprova que o pacote inclui uma implementação de WebSocket, **não** que uma conexão WebSocket esteja ativa ou que seja utilizada para IPC. Os nomes `computerUseTeach` e `computerUseWatchRecord` sugerem funcionalidades relacionadas a uso do computador, mas não revelam o comportamento nem comprovam gravação de tela. Arquivos `index.chunk-*.js` são artefatos de build; o filtro por nomes não identifica suas responsabilidades.

### Aplicações para REZ A.I (propostas)

1. Projetar um protocolo próprio de IPC para o futuro desktop com canais allowlisted, validação de payload e autorização no processo privilegiado.
2. Para o website, usar endpoints autenticados e, quando necessário, streaming ou WebSocket com controles de origem, autenticação e limites de recursos.
3. Construir adaptadores próprios para terminal Windows, com sandbox, consentimento e trilha de auditoria.
4. Projetar interfaces independentes para visualização, busca e consentimento, sem depender dos bundles proprietários observados.
5. Criar testes de IPC malformado, chamadas sem autorização, injeção de instruções por conteúdo externo e limites de execução.

**Próximo passo:** estudar APIs públicas do Electron e protocolos documentados, em vez de copiar ou redistribuir JavaScript compilado do Claude.


## Nona rodada — entradas de inicialização e quantidade de chunks

**Fonte:** listagem local de caminhos de `app.asar` por `@electron/asar list`, filtrada no PowerShell.

- Encontrados `.vite/build/index.js` e `.vite/build/index.pre.js`.
- O `package.json` já observado declara `.vite/build/index.pre.js` como `main`. A função precisa de `index.js` ainda não foi verificada.
- O filtro `index\.chunk-.*\.js$` retornou **330 caminhos**.
- O filtro por nomes contendo `electron|sandbox|permission|security` **não retornou caminhos**. Isso não indica ausência de IPC, sandbox, políticas de permissão ou outros controles: eles podem estar em bundles com nomes genéricos.

### Lições para a REZ A.I

- Organizar pontos de entrada explícitos e módulos especializados.
- Aplicar divisão de código quando houver benefício mensurável; a quantidade de chunks isoladamente não é métrica de qualidade.
- Implementar e testar políticas de segurança no código próprio, independentemente dos nomes dos arquivos.
- Investigar APIs documentadas do Electron para `main`, `preload`, `renderer` e IPC, sem reproduzir código proprietário.


## Décima rodada — dependências de desenvolvimento declaradas

**Fonte:** saída local de `package.json` da distribuição Claude Desktop 2.31226.1, seção `devDependencies`.

**Ferramentas declaradas:** `electron`, `@electron-forge/cli` e makers/plugins da linha `8.0.0-alpha.10`, `@electron/fuses`, `react`, `react-dom`, `typescript`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `vitest`, `playwright-core@1.57.0`, `@modelcontextprotocol/client`, `@modelcontextprotocol/core`, `@modelcontextprotocol/sdk`, `@anthropic-ai/claude-agent-sdk@0.3.295`, `@anthropic-ai/mcpb@2.1.2`, `zod`, `ajv`, `@sentry/electron`, `@xterm/headless@6.0.0`, `ssh2`, `winston`, `electron-store`.

**Pacotes internos ou privados indicados pelos nomes:** `@ant/ipc-codegen`, `@ant/security`, `@ant/private-api-client`, `@ant/managed-config`, `@ant/clawd-quest`, `@ant/cowork-win32-service`, `@ant/chrome-native-host`, `@ant/claude-ssh`, `@ant/browser-tool-schemas`, `@anthropic-ai/electron-devtools-mcp`. Suas implementações e funções reais não foram verificadas.

**Limites:** `devDependencies` não provam que cada pacote esteja presente no binário distribuído, seja executado em produção ou exponha determinada funcionalidade. Entradas `workspace:*` e `catalog:` indicam referências de workspace/catálogo, não versões finais resolvidas. O `package.json` publicado pode preservar metadados de build.

**Aplicações propostas para REZ A.I:** avaliar Electron + Forge para desktop, compartilhar componentes React/TypeScript com o frontend web, usar schemas Zod/JSON para validação, Vitest/Playwright para testes, MCP com consentimento e autorização, e observabilidade com tratamento cuidadoso de dados sensíveis. Não incorporar pacotes privados da Anthropic nem copiar seus componentes proprietários.


## Décima primeira rodada — workers, hosts MCP e recursos Office 365

**Fonte:** listagem somente leitura de caminhos do `app.asar`, filtrada por `worker|preload|pty|mcp`.

**Workers e tarefas observados:**
- `.vite/build/file-index-worker/fileIndexWorker.js`
- `.vite/build/heavy-work-worker/heavyWorkWorker.js` (com `dist-CI9lzb1v.js` e `rolldown-runtime-CI_2c2Xz.js`)
- `.vite/build/msal-broker-worker/msalBrokerWorker.js`
- `.vite/build/pty-host/ptyHostWorker.js`
- `.vite/build/shell-path-worker/shellPathWorker.js`
- `.vite/build/stall-sampler-worker/stallSamplerWorker.js`
- `.vite/build/transcript-search-worker/transcriptSearchWorker.js`
- `node_modules/node-pty/lib/worker/conoutSocketWorker.js`

**Entradas de execução MCP observadas:**
- `.vite/build/mcp-runtime/directMcpHost.js`
- `.vite/build/mcp-runtime/nodeHost.js`

**Recursos distribuídos no pacote:**
- `resources/github-mcp/github-mcp-server.exe`
- `resources/office365-mcp/msal-node-runtime.node`
- `resources/office365-mcp/msalruntime.dll`
- `resources/office365-mcp/office365-mcp-stdio.mjs`
- `resources/office365-mcp/pdf.worker.mjs`
- `resources/office365-mcp/pdfExtractorProcess.mjs`
- `node_modules/node-pty/prebuilds/win32-x64/conpty.node` e `conpty_console_list.node`

**Limites da evidência:** a existência dos caminhos confirma apenas o empacotamento. Os nomes sugerem busca de transcrições, indexação, execução MCP, terminal, Microsoft 365 e PDF, mas não comprovam execução em tempo real, funcionalidades expostas ao usuário, privilégios ou desenho exato de IPC.

**Aplicações propostas para REZ A.I:** (1) serviços/filas separados para indexação e busca na memória com controles de acesso; (2) runtime MCP original com registro de ferramentas, allowlist e consentimento; (3) terminal isolado, sem execução direta de comandos sugeridos por modelos; (4) processamento de PDF isolado e com limites de recursos; (5) telemetria de tarefas lentas sem capturar segredos. Todos esses itens permanecem **planejados**, não implementados.


## Décima segunda rodada — distribuição e tamanhos de recursos MCP

**Fonte:** listagem de caminhos de `app.asar` e `Get-ChildItem` recursivo, somente leitura, em `app/resources` da instalação Windows.

**Caminhos presentes na listagem ASAR:** `.vite/build/mcp-runtime/directMcpHost.js`, `.vite/build/mcp-runtime/nodeHost.js`, `resources/github-mcp/github-mcp-server.exe`, `resources/office365-mcp/msal-node-runtime.node`, `msalruntime.dll`, `office365-mcp-stdio.mjs`, `pdf.worker.mjs` e `pdfExtractorProcess.mjs`.

**Arquivos externos encontrados por nome e tamanho (bytes):**
| Arquivo | Bytes |
| --- | ---: |
| `github-mcp-server.exe` | 20.566.352 |
| `msal-node-runtime.node` | 365.904 |
| `msalruntime.dll` | 3.261.536 |
| `mcp.kl0G36TA.js` | 8.552 |

**Limites:** a busca externa filtrou nomes contendo `mcp|pdf|msal` e mostrou apenas arquivos acessíveis pelo `Get-ChildItem`; arquivos dentro do ASAR não aparecem necessariamente como arquivos independentes no disco. A presença de módulos não comprova inicialização, conexão ativa, autenticação nem permissões efetivas. A função de `mcp.kl0G36TA.js` não foi verificada.

**Aplicação planejada na REZ A.I:** separar registro/configuração de conectores da execução, aplicar autorização por ferramenta e operação, solicitar confirmação para efeitos externos, limitar processos e registrar auditoria sem segredos. Não reutilizar executáveis proprietários nem assumir compatibilidade sem verificar protocolos públicos.


## Décima terceira rodada — localização de módulo MCP em ion-dist

**Fonte:** consulta somente leitura via PowerShell a `Get-ChildItem` e `Get-AuthenticodeSignature`.

- Instalação consultada: `Claude_2.37337.1.0_x64__pzs8sxrjxfjjc`, versão diferente da `2.31226.1` das primeiras rodadas. Comparações entre rodadas devem considerar a atualização do aplicativo.
- Caminho relativo: `app/resources/ion-dist/_frame-rt/_runtime/mcp.kl0G36TA.js`.
- Tamanho: **8.552 bytes**.
- `Get-AuthenticodeSignature`: **NotSigned** para esse arquivo JavaScript individual. Isso não demonstra comprometimento, nem determina a assinatura do pacote/aplicativo.
- O nome `mcp` e o caminho `ion-dist` não demonstram por si só a finalidade, execução, privilégios ou conexão com os hosts MCP de `.vite/build/mcp-runtime`.

**Próximo passo seguro:** inspecionar apenas metadados de arquivos e permissões da instalação; não executar scripts internos nem acessar credenciais, tokens ou dados privados de usuários.


## Décima quarta rodada — ACL da instalação e metadados do pacote

**Fonte:** saída fornecida pelo usuário dos comandos `Get-AppxPackage -Name Claude` e `Get-Acl` sobre a pasta `InstallLocation`, sem modificações.

- Versão: **2.37337.1.0**.
- Nome do pacote: `Claude`; publicador declarado: `Anthropic, PBC`; `SignatureKind: Developer`; `IsFramework: False`.
- ACL apresentada: `BUILTIN\\Usuários` com `ReadAndExecute` e `Read`; `NT SERVICE\\TrustedInstaller` e `NT AUTHORITY\\SYSTEM` com `FullControl`; `BUILTIN\\Administradores`, `SERVIÇO LOCAL`, `SERVIÇO DE REDE` e `RESTRITO` com `ReadAndExecute`. Também aparecem SIDs de capacidade `S-1-15-3-...` e máscaras de acesso numéricas não decodificadas.
- As entradas de ACL exibidas não atribuem escrita diretamente ao grupo de usuários comuns. Isso **não** equivale a prova de isolamento do processo, ausência de escrita em outras pastas ou segurança geral.
- `SignatureKind: Developer` é um metadado de empacotamento; não equivale à verificação criptográfica de assinatura válida do pacote ou dos executáveis.
- SIDs de capacidade e direitos numéricos não foram identificados nesta rodada; não atribuir permissões específicas a eles sem análise adicional.

**Implicação para REZ Desktop:** instalar binários em diretório protegido, manter configuração e dados mutáveis em diretórios separados, aplicar permissões mínimas e testar a integridade de distribuição. Sandboxing, autorização de ferramentas e proteção de credenciais exigem mecanismos próprios, não demonstrados por esta ACL.


## Décima quinta rodada — capacidades e entradas do manifesto Windows

**Fonte:** `Get-AppxPackageManifest -Package (Get-AppxPackage -Name Claude).PackageFullName` e consulta somente leitura dos nós `Package.Capabilities` e `Package.Applications`, versão instalada 2.37337.1.0.

**Capacidades declaradas no manifesto:**
- `runFullTrust`
- `localSystemServices`
- `packagedServices`
- `unvirtualizedResources`
- `internetClient`

**Aplicativos declarados:**
| Id | Executable | EntryPoint |
| --- | --- | --- |
| `Claude` | `app\\Claude.exe` | `Windows.FullTrustApplication` |
| `SshAskpass` | `app\\resources\\claude-ssh-askpass.exe` | `Windows.FullTrustApplication` |
| `SshProxy` | `app\\resources\\claude-ssh-proxy.exe` | `Windows.FullTrustApplication` |

**Interpretação e limites:** `runFullTrust` e `Windows.FullTrustApplication` mostram que o pacote pode hospedar processos desktop fora do modelo restrito UWP. Não provam execução elevada como administrador, acesso irrestrito a todos os recursos, invocação efetiva dos auxiliares SSH nem ausência de outras proteções. `localSystemServices`, `packagedServices` e `unvirtualizedResources` foram observadas como declarações; seu uso efetivo não foi verificado.

**Relevância para REZ Desktop:** separar interface, provedores de IA e execução de ferramentas; exigir consentimento para operações com efeitos externos, impor privilégios mínimos e evitar presumir que o empacotamento Windows, por si só, isola processos full-trust.


## Décima sexta rodada — análise dos relatórios extraídos (versão 2.37337.1)

**Fonte:** três relatórios fornecidos pelo usuário: `inventario.csv`, `mapa-arquitetura.csv` e `package.json`, gerados após extração local do `app.asar`. Não incluir os artefatos proprietários no repositório.

- Inventário: **496 arquivos**, incluindo **421 `.js` e 4 `.mjs`**, 16 CSS, 6 JSON, 6 HTML e 3 arquivos `.jsc`. A lista de código também inclui outros formatos; esses números descrevem o inventário, não o código-fonte original.
- Mapa: **187 pares arquivo/padrão**, correspondendo a presença de strings em arquivos (não número de chamadas).
- Frequências: `sandbox` 40; `WebContents` 27; `child_process` 25; `spawn(` 15; `ipcRenderer` 14; `contextBridge` 14; `contextIsolation` 14; `BrowserWindow` 13; `worker_threads` 10; `ModelContextProtocol` 7; `node-pty` 5; `ipcMain` 2; `mcp-runtime` 1.
- `ipcMain` aparece em `.vite/build/index.pre.js` e `.vite/build/index.chunk-CHpJbW9_.js`; `mcp-runtime` aparece no segundo. `contextIsolation` aparece, entre outros, em `.vite/build/mainWindow.js`, `quickWindow.js` e arquivos renderer; verificar valores reais antes de concluir se está habilitado.
- Maiores arquivos observados: `resources/github-mcp/github-mcp-server.exe` (20.566.352 bytes), `resources/office365-mcp/office365-mcp-stdio.mjs` (7.288.531), `.vite/build/index.chunk-CHpJbW9_.js` (6.997.967), `.vite/build/index.chunk-CnuqahbP.js` (2.045.280), `.vite/build/index.pre.js` (918.204).
- `package.json`: `@ant/desktop`, versão **2.37337.1**, entrada `.vite/build/index.pre.js`, Node >=22. Contém **8 dependências**, **119 dependências de desenvolvimento** e dependência opcional `node-pty`. Inclui bibliotecas declaradas de Electron, React, Vite, MCP, SSH, testes e observabilidade. Dependências declaradas não demonstram execução em runtime.

**Limites:** o inventário não recupera fontes TypeScript originais; o mapa de strings não prova fluxos de controle, valores de segurança ou comportamento efetivo. A pesquisa deve continuar por trechos pequenos, revisados para evitar credenciais e código proprietário, sem subir fontes extraídas ao GitHub.

**Próxima investigação sugerida:** verificar os parâmetros de `webPreferences` nos módulos `mainWindow.js` e `quickWindow.js` e a interface IPC exposta por preloads, com resultados resumidos e sem reproduzir código.


## Décima sétima rodada — contagem de referências de segurança por janela

**Fonte:** PowerShell `Get-Content -Raw` + contagem literal de strings nos arquivos extraídos `.vite/build/mainWindow.js` e `.vite/build/quickWindow.js` (Claude Desktop 2.37337.1).

| String | mainWindow.js | quickWindow.js |
| --- | ---: | ---: |
| `sandbox` | 2 | 2 |
| `contextIsolation` | 1 | 1 |
| `nodeIntegration` | 0 | 0 |
| `webSecurity` | 0 | 0 |

**Limites:** são contagens de ocorrências textuais, não valores de `webPreferences`, estados efetivos das janelas ou provas de sandbox. Ausência de string não significa opção desativada; defaults, outros módulos e configurações de runtime podem intervir.

**Próximo passo:** obter apenas valores literais e contexto mínimo das opções `sandbox` e `contextIsolation`, com cuidado para não publicar código proprietário.


## Décima oitava rodada — busca por valores literais de isolamento

**Fonte:** PowerShell sobre `.vite/build/mainWindow.js` e `.vite/build/quickWindow.js` extraídos da versão 2.37337.1.

- Expressão procurada: `\b(sandbox|contextIsolation)\s*:\s*(true|false)` (uma propriedade por vez).
- **Ambos os arquivos:** nenhum valor literal `true`/`false` encontrado para `sandbox` ou `contextIsolation`.
- **Interpretação:** resultado inconclusivo. A configuração pode usar variável, propriedade entre aspas, sintaxe diferente, importação, atribuição posterior ou padrão do Electron. Não inferir que proteção esteja ativa ou inativa.
- **Próximo passo:** coletar somente indicadores estruturais em torno dos nomes de propriedade (por exemplo, caractere após os dois-pontos), sem publicar código extraído.


## Décima nona rodada — classificação das referências de isolamento

**Fonte:** PowerShell, arquivos `.vite/build/mainWindow.js` e `.vite/build/quickWindow.js`, versão 2.37337.1.

- Cada arquivo possui **2 ocorrências** da palavra `sandbox` e **1 ocorrência** de `contextIsolation`.
- Todas as ocorrências foram classificadas pelo script como **"Outra referencia"**, isto é, o texto imediatamente após o identificador não correspondeu ao padrão `^\s*:` nem `^\s*=`.
- Isso não estabelece se a ocorrência é string, propriedade entre aspas, acesso a objeto, comentário ou outro caso. O estado efetivo das proteções permanece **indeterminado**.

**Próximo passo:** coletar apenas contexto local curto para classificar a expressão, revisando a saída antes de compartilhar qualquer conteúdo potencialmente sensível.


## Vigésima rodada — contexto real das strings de isolamento

**Fonte:** trechos locais curtos extraídos com PowerShell dos arquivos `.vite/build/mainWindow.js` e `.vite/build/quickWindow.js`, versão 2.37337.1.

- As duas ocorrências de `sandbox` em cada arquivo pertencem a mensagens de aviso sobre a criação de **iframe sandbox** para verificações de fetch; **não são evidência de configuração da sandbox de processos Electron**.
- A ocorrência de `contextIsolation` em cada arquivo pertence a uma mensagem sobre código chamado em preload quando o isolamento de contexto está desativado. É uma referência textual a uma condição; **não demonstra que o isolamento esteja desativado na janela em execução**.
- Os contextos observados são iguais nos dois arquivos.
- **Correção interpretativa:** as contagens das rodadas 17–19 não devem ser tratadas como confirmação de `webPreferences.sandbox` ou `webPreferences.contextIsolation`. O estado efetivo permanece não verificado.

**Próxima ação:** buscar configuração de `BrowserWindow`/`webPreferences` nos pontos de criação da janela, preferencialmente produzindo apenas um resumo de propriedades e valores não sensíveis.


## Vigésima primeira rodada — arquivos com referência a webPreferences

**Fonte:** busca textual somente leitura por `webPreferences` nos arquivos JavaScript sob `.vite/build`, Claude Desktop 2.37337.1.

| Arquivo | Tamanho aproximado (KB) |
| --- | ---: |
| `index.chunk-CHpJbW9_.js` | 6834 |
| `index.chunk-o_T7PadS.js` | 50,9 |
| `index.chunk-D55C7xaU.js` | 40,6 |
| `index.chunk-CFtIIcWC.js` | 12,7 |
| `index.chunk-BZ1q5Elx.js` | 9,6 |
| `index.chunk-DeyJH3BC.js` | 9,4 |
| `index.chunk-CMqgVhx6.js` | 1,8 |

**Interpretação:** sete arquivos contêm a string `webPreferences`. O arquivo maior é candidato prioritário para inspecionar configurações, mas o tamanho e a ocorrência textual não provam que ele crie janelas nem revelam valores efetivos.

**Próxima etapa:** analisar somente nomes e valores simples das propriedades próximas de `webPreferences`, evitando publicar código proprietário ou conteúdo sensível.


## Vigésima segunda rodada — referências a opções de webPreferences

**Fonte:** PowerShell, busca textual nos arquivos JavaScript de `.vite/build` (Claude Desktop 2.37337.1). Contagem de `webPreferences\s*:` e presença de opções `nome\s*:` em cada **arquivo inteiro**.

| Arquivo | webPreferences | Opções encontradas |
| --- | ---: | --- |
| `index.chunk-CHpJbW9_.js` | 27 | sandbox, contextIsolation, nodeIntegration, preload, partition |
| `index.chunk-BZ1q5Elx.js` | 1 | sandbox, contextIsolation, nodeIntegration, preload |
| `index.chunk-o_T7PadS.js` | 1 | sandbox, contextIsolation, nodeIntegration, preload |
| `index.chunk-D55C7xaU.js` | 1 | sandbox, contextIsolation, nodeIntegration |
| `index.chunk-DeyJH3BC.js` | 1 | sandbox, contextIsolation, nodeIntegration |
| `index.chunk-CFtIIcWC.js` | 1 | preload |
| `index.chunk-CMqgVhx6.js` | 1 | preload |

**Limite crítico:** a presença de opções no mesmo arquivo não prova que estejam dentro do mesmo objeto `webPreferences`. Não há confirmação de valores nem da configuração efetiva das janelas.

**Próxima etapa:** extrair apenas pares nome/valor booleano próximos das ocorrências de `webPreferences:` para orientar análise, sem compartilhar código-fonte extraído.


## Rodadas 23–25 — análise de objetos webPreferences

**Fonte:** PowerShell, `index.chunk-CHpJbW9_.js`, Claude Desktop 2.37337.1.

- **Rodada 23:** nas 27 janelas textuais de 500 caracteres após `webPreferences:`, não foram identificados pares literais `sandbox/contextIsolation/nodeIntegration/webSecurity: true|false`. Busca textual, não análise sintática.
- **Rodada 24:** 18 das 27 ocorrências têm `{` como primeiro caractere não branco depois de `webPreferences:` (candidatos a objetos diretos); 9 começam com identificador/expressão. A classificação é heurística.
- **Rodada 25:** em janelas de 400 caracteres após os candidatos a objetos diretos, ocorreram referências `sandbox`, `contextIsolation`, `nodeIntegration` e `preload` sem valores booleanos literais detectados. Não houve referência a `webSecurity` nem `partition` nas janelas examinadas. A saída recebida para o objeto 2 foi parcial; evitar atribuir contagens exatas por opção.
- **Limitação:** as janelas textuais não respeitam os limites de objetos JavaScript. Uma referência detectada pode estar em objeto aninhado ou fora de `webPreferences`. Não inferir valores efetivos de segurança.
- **Próximo passo:** análise sintática local mais robusta ou busca por contextos estruturais reduzidos; não publicar código proprietário extraído.


## Vigésima sexta rodada — tipos heurísticos de valores das propriedades

**Fonte:** PowerShell, busca textual no arquivo `index.chunk-CHpJbW9_.js`, Claude Desktop 2.37337.1.

| Propriedade | Booleano literal | Expressão (heurística) | Função (heurística) | Objeto | Outro |
| --- | ---: | ---: | ---: | ---: | ---: |
| `sandbox` | 0 | 14 | 0 | 1 | 0 |
| `contextIsolation` | 0 | 13 | 0 | 0 | 0 |
| `nodeIntegration` | 0 | 13 | 0 | 0 | 0 |
| `preload` | 0 | 14 | 0 | 0 | 0 |

**Limitações:** o comando procura `nome\s*:` no arquivo inteiro, sem comprovar que as propriedades pertencem a `webPreferences`; as categorias de valor são heurísticas baseadas em prefixos, não uma análise sintática. A ausência de `true`/`false` literal **não revela os valores efetivos em execução**. A ocorrência `sandbox: {` pode se referir a outro objeto que não as opções de janela.

**Recomendação para REZ Desktop:** estabelecer explicitamente as opções seguras do Electron na própria aplicação, validar o comportamento em testes e expor apenas uma API mínima via preload/contextBridge. Não deduzir a segurança da REZ a partir da configuração não confirmada de outro produto.


## Vigésima sétima rodada — prefixos das expressões de segurança

**Fonte:** PowerShell, `index.chunk-CHpJbW9_.js`, versão 2.37337.1. Classificação heurística do início do valor depois de `nome:` no arquivo inteiro.

| Propriedade | Negação (`!`) | Identificador | Objeto | Chamada | Outro |
| --- | ---: | ---: | ---: | ---: | ---: |
| `sandbox` | 12 | 2 | 1 | 0 | 0 |
| `contextIsolation` | 13 | 0 | 0 | 0 | 0 |
| `nodeIntegration` | 13 | 0 | 0 | 0 | 0 |

**Interpretação:** o prefixo `!` indica expressão de negação, mas seu resultado depende do operando; não se pode inferir `true` ou `false`. A busca não garante associação com objetos `webPreferences`, nem demonstra a configuração efetiva das janelas. A ocorrência `sandbox: {` pode ser alheia às opções de janela.

**Encerramento da investigação textual de segurança:** resultados suficientes para orientar boas práticas, insuficientes para auditar o isolamento em tempo de execução do Claude. Para REZ Desktop, definir explicitamente `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true` onde aplicável, uma API mínima de preload e testes de regressão; considerar requisitos específicos de recursos antes de implementar.


## Vigésima oitava rodada — mapa textual IPC e processos

**Fonte:** PowerShell, busca regex recursiva em arquivos `.js` de `.vite/build`, Claude Desktop 2.37337.1. Os valores representam ocorrências textuais; não são chamadas executadas, canais únicos nem contagem de processos.

| Padrão | Ocorrências |
| --- | ---: |
| IPC Renderer | 1744 |
| Invoke | 1263 |
| Web Contents | 1029 |
| Send | 151 |
| Context Bridge | 52 |
| Handle | 32 |
| Process Spawn | 30 |
| Message Port | 17 |
| IPC Main | 13 |
| Worker Threads | 11 |

**Principais arquivos observados:**
- `mainView.js`: IPC Renderer 1519; Invoke 1151; Context Bridge 22.
- `index.chunk-CHpJbW9_.js`: Web Contents 861; Send 76; Handle 23; Process Spawn 12.
- `computerUseTeach.js`: IPC Renderer 45; Invoke 21.
- `computerUseWatchRecord.js`: IPC Renderer 32; Invoke 12.
- `watchRecordChooser.js`: IPC Renderer 32; Invoke 12.
- `quickWindow.js` e `mainWindow.js`: IPC Renderer 21 e Invoke 13 cada.
- `directMcpHost.js`: Send 18.

**Limitações:** as regex `\.invoke\s*\(`, `\.send\s*\(`, `\.handle\s*\(` e outras podem capturar APIs não relacionadas ao Electron, além de bibliotecas empacotadas. Os nomes dos arquivos são indícios de função, não prova de comportamento. Não se inferem topologia, canais IPC, permissões ou segurança somente das contagens.

**Implicações de design originais para REZ:** projetar contrato IPC tipado e mínimo, `contextBridge` com API restrita, validação de entradas no processo principal, permissões explícitas para ações sensíveis, isolamento de workers e testes; manter backend FastAPI separado da interface.

**Próxima pesquisa sugerida:** medir a distribuição dos padrões por arquivos e distinguir referências a `ipcRenderer.invoke`/`ipcMain.handle` de chamadas genéricas, apenas com estatísticas e sem publicar código extraído.


## Vigésima nona rodada — APIs explícitas do Electron

**Fonte:** PowerShell, regex somente leitura sobre arquivos JS de `.vite/build`, Claude Desktop 2.37337.1.

**Principais resultados:**
- `mainView.js`: `ipcRenderer.invoke` 1151; `ipcRenderer.on` 175; `contextBridge.exposeInMainWorld` 22; `ipcRenderer.send` 1.
- `computerUseTeach.js`: `ipcRenderer.invoke` 21; `ipcRenderer.on` 12; `contextBridge.exposeInMainWorld` 2.
- `buddy.js`: `ipcRenderer.invoke` 14; `ipcRenderer.on` 3; `contextBridge.exposeInMainWorld` 5.
- `mainWindow.js` e `quickWindow.js`: `ipcRenderer.invoke` 13 cada; `ipcRenderer.on` 4 cada; `contextBridge.exposeInMainWorld` 5 e 4, respectivamente.
- `computerUseWatchRecord.js` e `watchRecordChooser.js`: `ipcRenderer.invoke` 12 cada; `ipcRenderer.on` 10 cada; `contextBridge.exposeInMainWorld` 1 cada.
- `index.pre.js`: `ipcMain.on` 6.
- `index.chunk-CHpJbW9_.js`: `ipcMain.handle` 2.
- `localExecConsent.js`: `ipcRenderer.invoke` 1; `contextBridge.exposeInMainWorld` 1.
- `claudePagePreview.js`: `ipcRenderer.send` 3; `ipcRenderer.on` 2; `contextBridge.exposeInMainWorld` 1.

**Interpretação:** padrões explícitos de Electron identificados, mas contagens não equivalem a canais únicos, operações reais nem prova da finalidade de cada arquivo. Código minificado e bibliotecas incorporadas podem distorcer totais.

**Aplicação original na REZ:** especificar API de `contextBridge` pequena, operações IPC tipadas, validação e autorização no processo principal; separar permissões para execução local, arquivos e uso do computador.

**Próxima etapa:** estimar quantidade de canais literais por arquivo sem imprimir nomes ou código proprietário; distinguir nomes estáticos de canais dinâmicos.


## Trigésima rodada — canais IPC literais versus expressões

**Fonte:** PowerShell, inspeção textual de `ipcRenderer.invoke/send/on` e `ipcMain.handle` em arquivos selecionados do Claude Desktop 2.37337.1.

- `mainView.js`: `invoke` 6 canais com argumento inicial entre aspas e 1145 dinâmicos/indeterminados (total 1151); `on` 1 literal e 174 indeterminados (total 175); `send` 0 literal e 1 indeterminado.
- `mainWindow.js`: `invoke` 0 literal / 13 indeterminados; `on` 0 / 4.
- `quickWindow.js`: `invoke` 0 / 13; `on` 0 / 4.
- `computerUseTeach.js`: `invoke` 0 / 21; `on` 0 / 12.
- `localExecConsent.js`: `invoke` 1 literal / 0 indeterminados.
- `index.pre.js`: nenhum dos padrões específicos procurados apareceu no relatório.
- **Problema de apresentação:** a linha `Invoke: 1` e `On: 1` para `mainView.js` conflita com as somas 1151 e 175; tratar os totais derivados das categorias como provisórios e confirmar em próxima execução. O código compartilhado pelo usuário era baseado em `$matches.Count`, mas a saída exibida não refletiu esses totais.

**Limitações:** `dinâmico/indeterminado` significa apenas que o primeiro argumento não começa com aspas. Pode ser uma constante estática, identificador minificado ou expressão. Nenhum nome de canal ou código extraído foi armazenado.

**Aplicação original REZ:** definir canais IPC próprios em constantes tipadas, validar argumentos e autorizar operações sensíveis no processo principal. Não aceitar nomes de canais arbitrários enviados pelo renderer.


## Trigésima primeira rodada — tipos do primeiro argumento de ipcRenderer.invoke

**Fonte:** PowerShell, classificação heurística dos argumentos de chamadas `ipcRenderer.invoke(` em cinco arquivos extraídos do Claude Desktop 2.37337.1.

| Arquivo | Identificador | Literal | Total |
| --- | ---: | ---: | ---: |
| `mainView.js` | 1145 | 6 | 1151 |
| `mainWindow.js` | 13 | 0 | 13 |
| `quickWindow.js` | 13 | 0 | 13 |
| `computerUseTeach.js` | 21 | 0 | 21 |
| `localExecConsent.js` | 0 | 1 | 1 |
| **Total** | **1192** | **7** | **1199** |

As categorias `Funcao`, `Objeto` e `Outro` tiveram zero ocorrências nos arquivos examinados. Aproximadamente 99,4% das chamadas analisadas começam com um identificador. **Isso não prova que os canais estejam centralizados em constantes:** podem ser aliases de código empacotado, variáveis locais ou outras referências.

**Aplicação original REZ:** criar contratos de canais IPC tipados e com validação de argumentos e autorização por ação. Não transportar identificadores, canais ou código proprietários da instalação analisada para o repositório público.

**Próxima investigação:** distinguir padrões de identificadores simples, acesso a propriedade e aliases minificados, apresentando somente contagens.


## Mega auditoria estática — 13 de outubro de 2026

**Origem:** cinco relatórios gerados localmente pelo auditor PowerShell sobre a instalação autorizada do Claude Desktop: `RELATORIO.md`, `resumo-tecnologias.csv`, `tecnologias-por-arquivo.csv`, `argumentos-ipc.csv` e `inventario-js.csv`. Não incluir os arquivos extraídos ou nomes de canais no repositório.

**Cobertura:** 370 arquivos JavaScript encontrados e analisados; zero avisos. `tecnologias-por-arquivo.csv` contém 573 pares arquivo/categoria; `resumo-tecnologias.csv` contém 36 categorias; `argumentos-ipc.csv` contém 12 arquivos com invocações; `inventario-js.csv` contém 370 registros.

**Totais textuais selecionados:** `session` 4993; `http` 1820; `Electron IPC Renderer` 1744; `IPC invoke direto` 1263; `MCP` 1198; `WebContents` 985; `permission` 615; `sandbox` 500; `IPC on direto` 230; `consent` 138; `safeStorage` 121; `BrowserWindow` 78; `ContextBridge expose` 52; `ModelContextProtocol` 43; `WebSocket` 42; `webPreferences` 37; `child_process` 36; `preload` 36; `spawn` 30; `Worker` 23; `contextIsolation` 21; `nodeIntegration` 17; `worker_threads` 11; `setPermissionRequestHandler` 5; `webSecurity` 0. A ausência de string `webSecurity` não comprova a configuração efetiva.

**Concentrações observadas:** `mainView.js` contém 1519 referências `ipcRenderer`, 1151 invocações IPC diretas e 175 assinaturas `ipcRenderer.on`. `index.chunk-CHpJbW9_.js` concentra 817 referências `WebContents`, 813 `http`, 600 `MCP`, 179 `permission`, 103 `safeStorage`, 98 `sandbox`. `index.chunk-CnuqahbP.js` contém 1280 `session`; `index.chunk-DmIbHAP6.js` contém 988 `session`.

**IPC — detalhe da classificação:** em `mainView.js`, 1151 chamadas: 6 literais, 1142 identificadores simples, 3 acessos a propriedade; isso refina a rodada 31, que agrupava propriedades como identificadores. Não presumir nomes de canais nem contratos internos.

**Interpretação:** auditoria estática de padrões; não mede execução real, chamadas únicas, funcionamento de recursos, qualidade de modelos nem arquitetura dos servidores. Bibliotecas incorporadas, minificação e duplicação podem inflar contagens. Não reproduzir código proprietário.

**Prioridades originais para REZ A.I:** (1) streaming e métricas de latência no FastAPI e frontend; (2) camada de ferramentas com permissões explícitas e logs; (3) contrato IPC tipado e preload mínimo para futuro Electron; (4) MCP sob allowlist e isolamento de processos; (5) gerenciamento de sessão/memória com privacidade e testes. Avaliar qualidade com benchmarks antes de afirmar que a REZ supera concorrentes.


## Auditoria profunda concluída — 13/10/2026

**Material recebido:** `RELATORIO-PROFUNDO.md` e os dez CSVs numerados de 00 a 09. Análise feita exclusivamente sobre metadados/contagens, sem publicar código distribuído do Claude.

- **Cobertura:** 425 arquivos JavaScript, total de 39.571.404 bytes (~39,6 MB), distribuídos em 24 diretórios; 0 avisos de leitura.
- **Source maps:** 0 arquivos `.map` separados; 371 arquivos JS com referências a `sourceMappingURL`, total de 376 referências. Classificação das referências: 370 `arquivo-relativo`, 3 `referencia-invalida-ou-nao-arquivo`, 2 `externa-ou-outra`, 1 `embutida-base64-ou-texto`. O CSV sinaliza 1 referência como `DisponivelLocalmente=True`; exige verificação específica, sem presumir que seja mapa original completo.
- **Padrões textuais:** `session` 5452; `require call` 2902; `ipcRenderer.invoke` 1263; `MCP` 1226; `webContents` 991; `process.env` 875; `sandbox` 554; `permission` 462; `WebSocket` 429; `fetch` 288; `consent` 160; `safeStorage` 121; `spawn` 82; `contextBridge.expose` 52; `worker_threads` 28.
- **IPC:** 1263 chamadas classificadas em 12 arquivos: 1252 argumentos como variável/identificador, 8 literais e 3 propriedades. `mainView.js` concentra 1151 chamadas; `computerUseTeach.js` 21; `buddy.js` 14; `aboutWindow.js`, `mainWindow.js` e `quickWindow.js` 13 cada.
- **Configurações Electron:** 9 grupos de indícios de `sandbox` distribuídos entre `index.chunk-C4qJSrNf.js` (5), `index.chunk-CHpJbW9_.js` (2), `index.chunk-SQd0JTX3.js` (1) e `index.chunk-YBFVQBQ_.js` (1). Nenhum valor booleano explícito detectado nesses grupos; não inferir configurações efetivas.
- **Diretórios com nomes informativos:** `.vite/build/mcp-runtime`, `pty-host`, `file-index-worker`, `transcript-search-worker`, `heavy-work-worker`, `msal-broker-worker` e `resources/office365-mcp`. Os nomes sugerem responsabilidades, mas não provam comportamento em execução.
- **Arquivos grandes:** `resources/office365-mcp/office365-mcp-stdio.mjs` ~7,29 MB; `.vite/build/index.chunk-CHpJbW9_.js` ~7,00 MB. Tamanho e frequência de termos não equivalem a relevância funcional.
- **Limitações:** resultados são busca textual heurística sobre bundles minificados e dependências; não recuperam fontes originais, serviços remotos, configurações de runtime ou segurança efetiva.

**Aplicação para REZ A.I:** priorizar arquitetura original com contrato IPC tipado, validação de payloads e allowlist, autorização explícita por ferramenta, separação de workers, observabilidade, MCP opcional e armazenamento seguro. Implementar e testar no próprio repositório sem copiar código proprietário.


## Reconstrução local — relatórios recebidos (14/10/2026)

**Entradas:** `RELATORIO-RECUPERACAO.md`, `01-arquivos-js.csv`, `02-sourcemaps.csv`, `03-binarios-cabecalhos.csv`, `04-avisos.csv` e script do analisador local. Sem copiar código proprietário para o repositório.

- 425 JavaScript, 39.571.404 bytes; 423 formatados com Prettier, 2 pulados **somente por limite de tamanho de 6 MB**: `.vite/build/index.chunk-CHpJbW9_.js` (6.997.967 bytes) e `resources/office365-mcp/office365-mcp-stdio.mjs` (7.288.531 bytes).
- 370 referências `sourceMappingURL` reportadas; 0 mapas separados, 0 mapas encontrados/validados, 0 fontes originais recuperadas. O arquivo `02-sourcemaps.csv` lista 370 referências relativas ausentes. Formatador não reconstitui nomes originais, comentários ou TypeScript.
- 6 binários nativos identificados por cabeçalho **PE x64**: `node_modules/@ant/claude-native/claude-native-binding.node` (3.778.896 bytes, 6 seções); `node_modules/node-pty/prebuilds/win32-x64/conpty.node` (312.144 bytes, 8 seções); `conpty_console_list.node` (155.472 bytes, 8 seções); `resources/github-mcp/github-mcp-server.exe` (20.566.352 bytes, 8 seções); `resources/office365-mcp/msal-node-runtime.node` (365.904 bytes, 8 seções); `resources/office365-mcp/msalruntime.dll` (3.261.536 bytes, 7 seções). Cabeçalhos PE não são desassemblagem.
- Zero avisos reportados.
- O script `REZ_analisador_local.js` usa Prettier para análise sintática, lê cabeçalhos binários, procura comentários `sourceMappingURL`, e não executa JS do aplicativo. A detecção de `sourceMappingURL` usa regex de comentário de linha, portanto não cobre todos os formatos possíveis.

**Próxima etapa técnica:** opcionalmente reexecutar a formatação local com limite 12 MB (atenção à memória) e estudar contratos IPC e permissões a partir de padrões, sem exportar fonte do Claude. Priorizar implementação original REZ.


## Formatação integral dos bundles JavaScript — 14/10/2026

O usuário executou novamente `REZ_Reconstrucao_Local.ps1` com `-MaxFormatMB 12` na instalação local autorizada. Resultado de terminal: **425/425 arquivos JavaScript formatados**, **0 avisos**, **6 binários identificados**, **0 source maps válidos**, **0 fontes originais recuperadas**. Saída local: `Desktop/Claude-Research/REZ-Fonte-Local-20261014-000314`. Este resultado confirma apenas formatação bem-sucedida do código distribuído, não recuperação do repositório fonte nem dos serviços remotos. Próximo passo: análise estrutural estática de dependências, pontos de entrada, IPC, permissões e módulos nativos, com resultados agregados e sem publicar código proprietário.


## Fluxo MCP e fallback — 14/10/2026

Análise estática de trechos locais de `directMcpHost.js` enviados pelo usuário: o módulo recebe `addServer` com `MessagePort` e processa respostas de elicitation e autenticação; cria cliente MCP, seleciona transporte SSE quando configurado, negocia inicialização, descobre ferramentas via `listTools()`, aplica timeouts e fecha recursos em falhas. A função de fallback tenta primeiro a conexão com negociação de versão e, apenas se ela estiver habilitada e o erro satisfizer o predicado específico, tenta uma vez sem a negociação. Há uma fila de solicitações pendentes com identificadores sequenciais e cancelamento, além de uma política de fetch que rejeita redirecionamentos HTTP. Limitações: as condições completas de erro dependem de funções auxiliares ainda não analisadas; inspeção de código distribuído não demonstra execução real. Não foram copiados trechos proprietários.


### Condições verificadas para fallback MCP (14/10/2026)

Inspeção estática das linhas 30170–30257 do bundle formatado `directMcpHost.js`: a função de classificação combina (1) timeout de sondagem de negociação de versão, (2) causas de sondagem classificadas como SyntaxError, ZodError ou conteúdo HTTP inesperado, e (3) condições específicas de autenticação/negociação, incluindo mensagem de 401 após reautenticação e determinados códigos associados a HTTP 401, 403 e 5xx. O fallback só ocorre se a negociação estava ativada e um desses predicados é verdadeiro; caso contrário, o erro é propagado. O trecho também contém tratamento de mensagens `updateAuth` e `updateHeaders`, incluindo validação de estrutura de cabeçalhos e substituição do Bearer. Observação: análise de código estático, não prova de comportamento em execução; não foram incluídos trechos de código proprietário.


### Controle de ferramentas por sessão (14/10/2026)

Análise estática das linhas 14992–15052 de um chunk distribuído: o coordenador prepara um controle por sessão para chamadas de ferramentas, considera um callback `canUseTool`, listas de ferramentas permitidas/proibidas, uma classificação de ferramentas somente leitura e um registro de aprovações. Servidores MCP internos são envolvidos em adaptadores associados à sessão; a ausência de um controle registrado gera indicação de recusa até o próximo registro. O encerramento da sessão remove o controle e descarta aprovações. A implementação interna dos auxiliares ainda precisa ser examinada; não está demonstrado que todas as chamadas passam por essa camada. Recomenda-se para REZ A.I autorização por sessão, padrão de recusa e confirmação explícita para operações sensíveis. Sem inclusão de código proprietário.


### Mecanismo de autorização de ferramentas MCP (14/10/2026)

Análise estática das linhas 13640–13822 do chunk formatado `index.chunk-DmIbHAP6.js`: o registro de aprovações indexa autorizações por sessão, ferramenta e hash SHA-256 dos argumentos serializados. Uma resposta positiva de `canUseTool` pode gerar um registro sob condições específicas. O controle verifica primeiro ferramentas proibidas; depois consulta registros de aprovação, permissões explícitas, concessões e modos de autorização, incluindo uma exceção de leitura em modo automático. Quando necessário, solicita uma decisão por callback. Ausência de callback válido, exceção ou cancelamento resultam em recusa. Ausência de controle registrado também resulta em recusa. Limites: a semântica de consumo único depende da implementação do armazenamento de registros ainda não analisada; a aplicação do controle no wrapper de execução exige inspeção adicional. Não foram copiados trechos proprietários.


### Ciclo de vida dos registros de aprovação MCP (14/10/2026)

Análise estática das linhas 13266–13344 de `index.chunk-DmIbHAP6.js`: um registro ativo possui expiração inicial de 120 segundos; a consulta `spend` altera seu estado de ativo para consumido e não aceita novamente o mesmo registro. Existem operações para renovar validade de registros ativos, marcar negações, descartar registros por prefixo de sessão e remover entradas expiradas. Registros já finalizados são limitados a 256 por conjunto no processo de limpeza. Esta evidência confirma consumo único do registro, mas não significa que toda ferramenta exige aprovação manual, pois outros caminhos de autorização foram identificados. Registro descritivo sem reprodução de código proprietário.


### Aplicação da autorização na ponte MCP interna (14/10/2026)

Análise estática das linhas 13490–13597 de `index.chunk-DmIbHAP6.js`: um adaptador de transporte intercepta solicitações `tools/call` e encaminha a mensagem somente após decisão positiva e ausência de cancelamento. Argumentos atualizados por uma decisão autorizada podem substituir os argumentos originais; decisões negativas produzem resposta de recusa. O wrapper `tC` cria um Proxy para instâncias de servidor MCP e intercepta `connect` para instalar o adaptador. Esta é evidência de aplicação de controle no caminho de transporte para servidores MCP internos, não prova de cobertura universal para todos os tipos de ferramentas ou servidores. Descrição arquitetural sem cópia de código proprietário.
