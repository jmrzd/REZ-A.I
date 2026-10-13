# REZ OS Agent — Windows 10 e 11

Protótipo local da integração entre Rez A.I e o sistema operacional. **Este agente ainda não é controlado pelo chat web nem escuta o microfone.** Recebe comandos de texto em um terminal e abre somente sites de uma lista explícita no navegador padrão.

## Executar no Windows

1. Instale Python 3.10 ou mais recente (marque **Add Python to PATH** no instalador).
2. Clone o projeto e abra **PowerShell** dentro da pasta do repositório.
3. Execute:

```powershell
cd os-agent
py -3 agent.py
```

Se o comando `py` não existir, tente `python agent.py`.

Digite: `Rez, abre meu Gmail`, `Hey Rez, open YouTube` ou `Rez, abre mi correo`. Para encerrar, digite `sair`.

## Testes

```powershell
cd os-agent
py -3 -m unittest discover -s tests -v
```

O protótipo usa somente a biblioteca padrão do Python. Não requer permissões de administrador.

## Segurança e limites

- Os sites são fixos e auditáveis no dicionário `SITES` em `agent.py`, com catálogo separado em `policy.py` (a suíte verifica a correspondência).
- Todo comando reconhecido passa por `SecurityPolicy.authorize()`; ações desconhecidas, URLs fora da allowlist, instalações, shell e manipulação de arquivos são bloqueados por padrão.
- A política é imutável; `emergency_stop=True` bloqueia novas ações, mas não fecha abas já abertas. Essa flag ainda não possui botão de interface.
- Não captura áudio, não acessa e-mails, não usa credenciais e não instala serviço de inicialização automática.
- Abrir Gmail não equivale a ler a conta: a autenticação acontece normalmente no navegador.
- Comandos simples em português, inglês e espanhol são suportados; **não** é compreensão multilíngue geral.
- Deve funcionar em Windows 10/11 com Python e navegador padrão; a validação real em ambos ainda está pendente.

## Próximos passos

1. Testar Windows 10 e 11;
2. Criar ponte autenticada entre o frontend/backend e o agente, com autorização explícita;
3. Adicionar reconhecimento de fala e hotkey de ativação;
4. Implementar adaptadores Linux (incluindo ambientes Wayland);
5. Acrescentar aplicativos locais e controles por sistema operacional com permissões granulares.

## Arquivos de segurança

- `policy.py`: enum de ações, catálogo de URLs e autorização com negação por padrão.
- `tests/test_agent.py`: regressão e testes de segurança.
- `../docs/SECURITY.md`: ameaças, limites e futuras salvaguardas.

**Atenção:** esta fase não autoriza acesso a arquivos locais, instalações, controle do desktop nem operação remota. Não executar o agente como administrador.
