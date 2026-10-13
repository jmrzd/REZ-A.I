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

- Os sites são fixos e auditáveis no dicionário `SITES` em `agent.py`.
- Comandos não reconhecidos são rejeitados; não há execução de comandos de terminal ou manipulação de arquivos.
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
