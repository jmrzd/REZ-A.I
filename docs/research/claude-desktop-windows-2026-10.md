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
