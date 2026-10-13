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
