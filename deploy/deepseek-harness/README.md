# REZ A.I + DeepSeek Harness — servidor remoto isolado

> **Estado:** infraestrutura preparada em código; **não há servidor remoto DSH ativo**. Publicar estes arquivos no GitHub não executa um processo persistente na Vercel, nem adiciona os pesos de um modelo de linguagem.

## O que estamos usando de fato

Fonte: https://github.com/deepseek-ai/deepseek-harness (licença MIT, versão revisada `0.2.2-rc.5`, ramo `master`).

O **DeepSeek Harness (`dsh`)** é um **ambiente de agentes**, com interface Web, plugins, gerenciamento de sessões e ferramentas para trabalhar em repositórios. **Ele não é o modelo DeepSeek** e **não possui capacidade de inferência de LLM sem conexão com algum modelo**. A interface padrão pede credencial de um provedor DeepSeek; pode usar um endpoint compatível auto-hospedado se existir computação para executar o modelo. A biblioteca é experimental, com aviso explícito de **ausência de auditoria de segurança**.

## Arquivos preparados

- `Dockerfile`: instala `@deepseek-ai/dsh@0.2.2-rc.5` em **Node 24** no servidor, não no PC do visitante.
- `compose.yaml`: processo persistente, usuário não privilegiado, volumes dedicados, recursos limitados e **nenhuma porta pública**.
- `compose.private.yaml`: acesso privado à porta 3080 **somente no loopback do próprio servidor**.
- `compose.public.yaml` + `Caddyfile`: opção de HTTPS + autenticação extra por senha; exige domínio e configuração explícita.
- `.env.example`: esquema de configuração, **sem senhas reais**.
- `../../docs/REZ_DEEPSEEK_HARNESS_V23.md`: avaliação técnica e limites da integração.

## Não exige instalação no seu computador

As operações abaixo ocorrem **em uma máquina remota com Docker**, administrada por você. Podem ser feitas por uma ferramenta web do provedor de hospedagem (console remoto). **Não execute os comandos no seu PC**.

### Modo privado (mais seguro para começar)

1. Provisione **um servidor remoto Linux dedicado** que permita Docker, processo sempre ativo e armazenamento persistente. Vercel Functions não substituem esse tipo de servidor.
2. No **console remoto do servidor**, baixe o repositório, selecione a branch de integração e entre em `deploy/deepseek-harness`.
3. Execute os comandos abaixo **apenas no servidor remoto**:

```sh
docker compose -f compose.yaml -f compose.private.yaml up -d --build
docker compose -f compose.yaml -f compose.private.yaml logs --tail 80 harness
```

A interface escuta **somente em 127.0.0.1:3080 do servidor remoto**, não está pública. Use acesso privado autenticado por SSH ou VPN para abri-la. O URL de inicialização do Harness nos logs inclui **credencial de sessão**: não o copie para uma conversa pública ou para logs de CI acessíveis a terceiros.

### Opção HTTPS pública (somente com revisão de segurança)

O uso remoto por navegador sem túnel exige um domínio seu, DNS apontando para o servidor, HTTPS e um controle de acesso. A sobreposição `compose.public.yaml` prepara Caddy com HTTPS e HTTP Basic Auth; a página DSH também exige seu token de inicialização.

No servidor:
1. Copie `.env.example` para `.env` e altere o domínio, usuário e **hash de senha forte** (nunca a senha em claro).
2. Configure o DNS e as portas 80/443 somente para o proxy.
3. Faça uma revisão de segurança e **só então**, caso aceite o risco da versão experimental, execute:

```sh
docker compose -f compose.yaml -f compose.public.yaml up -d --build
```

**Não expor o Harness diretamente com `0.0.0.0:3080:3080`**, nem desativar a senha ou publicar o URL com token. Não montar pastas pessoais, chaves SSH ou credenciais de outros sistemas no contêiner. Os agentes podem executar comandos — Caddy e Docker não garantem isolamento contra toda falha. Faça backups dos volumes.

## Como seria a integração com a REZ

- **REZ Native (Vercel)** continua sendo nosso chat de código e conhecimento sem API comercial de IA.
- **DeepSeek Harness** roda **em um segundo serviço**, de longa duração, isolado em contêiner, com sua interface própria e acesso privado.
- Uma ponte autenticada entre REZ e Harness somente deve ser considerada depois de validar a versão do protocolo, permissões, logs, isolamento e autenticação. **Nenhuma ponte foi ativada** e a REZ não envia mensagens, projetos ou documentos ao Harness neste momento.
- Para que o Harness responda como agente generativo, será necessário conectar um modelo remoto (pode ter limites/cobrança) ou instalar pesos de modelo **no servidor remoto**, com RAM/CPU/GPU suficientes. O Harness sozinho não inventa capacidade de IA.

## Teste e manutenção

A CI `deepseek-harness-container.yml` valida as configurações de rede e tenta compilar a imagem **nos servidores do GitHub**, sem usar seu PC. Isso é um teste do contêiner, não um deploy permanente.

Para atualizar no futuro, revise o changelog e a licença, altere intencionalmente a versão `@deepseek-ai/dsh`, execute os testes e faça backup dos volumes antes de substituir a imagem. A versão upstream é *developer preview* e pode introduzir mudanças incompatíveis.

Referências oficiais:
- https://github.com/deepseek-ai/deepseek-harness
- https://github.com/deepseek-ai/deepseek-harness/blob/master/SAFETY.md
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/index.md
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/public-deployments.md
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/providers.md
