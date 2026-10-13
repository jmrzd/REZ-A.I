# Integração universal com sistemas operacionais

## Escopo e ordem de prioridade

1. **Windows 10/11:** primeiro alvo para o Rez OS Agent.
2. **Linux:** Arch/CachyOS/Hyprland, Ubuntu/Debian/GNOME, Fedora/KDE e outros ambientes por adaptadores.
3. **macOS:** integração via APIs e permissões do sistema.
4. **Android e iOS:** apps nativos ou multiplataforma dentro das restrições das plataformas.

"Universal" é uma ambição de arquitetura, **não uma promessa de controle irrestrito**. Cada sistema impõe APIs, permissões, versões e limitações. O Windows 10 também pode depender de atualizações de segurança disponíveis.

## Implementação atual

`os-agent/agent.py` é um processo Python local, comandado no terminal, que reconhece frases simples e abre sites predefinidos via `webbrowser`. Não controla janelas/abas, não captura áudio e não está conectado ao frontend. Houve teste manual reportado pelo criador no Windows, mas **não há matriz completa de testes em 10 e 11**.

Veja [README do OS Agent](../os-agent/README.md).

## Arquitetura de adaptadores proposta

```text
Entrada (texto/voz/desktop/web)
             |
     Rez Core + Context
             |
     Política de permissões
             |
     Rez OS Agent local
       /        |        \
 Windows      Linux      macOS
       \        |        /
     Navegador (extensão)
```

Interface abstrata ilustrativa:

```python
class OSAdapter:
    def open_approved_url(self, url: str) -> bool: ...
    def launch_approved_app(self, app_id: str) -> bool: ...
    def focus_approved_window(self, window_id: str) -> bool: ...
```

Os métodos acima ainda não são a API implementada.

## Windows

Priorizar bibliotecas padrão para URLs e interfaces oficiais para aplicativos, com catálogo de IDs autorizados. Futuramente, estudar APIs de acessibilidade/UI Automation e, para navegador, extensão dedicada. Não executar `cmd`, PowerShell ou comandos sugeridos por LLM sem validação rigorosa/consentimento específico.

## Linux

Não assumir que todas as distros funcionam igualmente: X11 e Wayland diferem no gerenciamento de janelas. Em GNOME, KDE e Hyprland, usar APIs/portais disponíveis, integrações específicas e permissões adequadas. Propor fallback quando o compositor bloquear automação.

## Navegador e referência a abas

Abrir URLs com `webbrowser` é diferente de conhecer, listar ou focar abas. Para "volta pra primeira aba", planejar uma **extensão de navegador** com permissões mínimas e associação segura de `tab_id` à sessão. Nunca acessar o conteúdo de todas as abas indiscriminadamente.

## Comunicação segura web ↔ agente local

**Não existe hoje.** Quando implementada:
- servidor local vinculado a `127.0.0.1`, sem aceitar conexões remotas;
- autenticação entre frontend e agente com token de sessão e expiração;
- validação de Origin/CORS e defesa contra páginas maliciosas na rede local;
- allowlist de ações e de alvos, aprovação por ação sensível;
- logs mínimos, com opção de exclusão;
- versão de protocolo, health check e capacidade de revogar acesso.

Não expor diretamente execução de comandos de SO pela internet.

## Plano de validação

- Windows 10 e Windows 11: instalação Python, navegador padrão, execução de comandos suportados e desconhecidos.
- Linux: testes em X11 e Wayland por ambiente, sem recorrer a privilégios elevados.
- Verificar respostas de erro, recusas, foco da janela e permissões.
- Registrar versão de OS, distribuição, sessão gráfica, versão Python, resultados e limitações.
