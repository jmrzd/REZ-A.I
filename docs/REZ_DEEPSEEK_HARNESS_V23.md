# REZ A.I v2.3 — preparação para usar DeepSeek Harness no servidor

**Implementação atual: integração de infraestrutura em branch de teste. O DeepSeek Harness NÃO está implantado nem conectado à REZ em produção.**

## Auditoria do repositório upstream (21 de novembro de 2026)

- Fonte: https://github.com/deepseek-ai/deepseek-harness — versão `0.2.2-rc.5` (ramo `master`), desenvolvida pela DeepSeek.
- Tipo: *agent harness*, um orquestrador de agentes e ferramentas, escrito principalmente em Node/TypeScript. O README o chama de *developer preview*.
- Licença: **MIT**. Respeitar também licenças das dependências informadas em THIRD_PARTY_NOTICES.md.
- Execução: `npx @deepseek-ai/dsh web`, Web UI local na porta 3080; requer Node >=24.9.0, serviço de longa duração e armazenamento para perfis/sessões.
- **Não contém um modelo de linguagem completo**. A documentação `docs/user/guide/index.md` instrui configurar uma chave do serviço DeepSeek; também aceita endpoints personalizados para modelos auto-hospedados. O repositório sozinho **não transforma a REZ em uma IA generativa grátis ou ilimitada**.
- Segurança: `SAFETY.md` avisa que **não existe auditoria de segurança** e que agentes podem executar comandos, tocar arquivos e credenciais; recomenda ambiente isolado, mínimo privilégio e backups.
- Redes: `docs/user/guide/public-deployments.md` exige preservar `Host`, WebSocket, cookies e URL pública. A interface tem um token de sessão na URL de inicialização. Nenhum token deve ir ao GitHub nem ao chat.

## O que entrou no repositório REZ

Diretório [deploy/deepseek-harness](../deploy/deepseek-harness/README.md) contém:

1. **Dockerfile** com versão upstream fixada, Node 24 e instalação feita dentro da imagem remota.
2. **Compose privado** (nenhuma porta de host). Sobreposição de túnel SSH limita o acesso ao loopback.
3. **Sobreposição HTTPS opcional** com Caddy e autenticação HTTP Basic; requer domínio e revisão cuidadosa de segurança. Não habilitada automaticamente.
4. Volumes de persistência separados, execução como usuário não privilegiado, proteção contra elevação de privilégio e limites de recursos. Esses controles **não constituem isolamento comprovadamente seguro** para agentes maliciosos.
5. **GitHub Actions** que valida as configurações de rede e constrói/testa o CLI no GitHub, sem recursos do seu computador.

## Arquitetura pretendida

```
Navegador do usuário
       |
       +--> REZ A.I (Next.js na Vercel)
       |      +-- REZ Native: regras, exemplos de código e fontes
       |      +-- Cloudflare: somente quando configurado pelo proprietário
       |
       +--> [HTTPS + autenticação forte, domínio separado]
                    |
                Caddy proxy
                    |
             DeepSeek Harness
             (Node persistente)
                    |
              Modelo de IA
     (API com limites/custos OU pesos hospedados
       num servidor remoto com CPU/GPU suficientes)
```

**Não conectar o navegador público da REZ diretamente às ferramentas de shell do DSH.** Sessões de agente com acesso a código e comandos devem ter autenticação e isolamento próprios. Nesta atualização, a integração segura é por **implantação separada**, não por compartilhamento de credenciais, histórico ou sessões. A ponte de dados com a UI da REZ não foi implementada.

## O que impede ligar tudo agora

A infraestrutura identificada da REZ é o **projeto Next.js hospedado na Vercel**. Funções serverless não substituem um processo Node persistente com espaço de trabalho, ferramentas e WebSocket. Nesta conversa não há um servidor Linux persistente da pessoa vinculado/autorizado no qual possamos instalar o Harness. A instalação precisa desse destino ou de um serviço de contêiner adequado. Sem isso, o código fica preparado, mas a aplicação não começa a executar.

**Sem cobrar:** nenhum plano pago, chave de modelo, API comercial ou conta adicional foi ativado. Quando existir um host remoto, sua conta será necessária para provisionar o recurso. Um contêiner isolado por si só não oferece inferência avançada, e hospedagem gratuita permanente com GPUs não está garantida.

## Condições para chamar “implantado”

- Build da imagem e comando `dsh --version` executados no GitHub Actions.
- Host remoto provisionado e processo DSH funcionando como não-root com volume persistente.
- Acesso privado e TLS/autenticação validados; token inicial não vazado.
- Um modelo configurado, com condições de uso e custos conhecidos, e uma conversa de teste real.
- Só depois adaptar a REZ para integrar ferramentas de agente com permissão explícita e sem expor comandos à internet.

Referências:
- [Projeto oficial](https://github.com/deepseek-ai/deepseek-harness)
- [Avisos de segurança](https://github.com/deepseek-ai/deepseek-harness/blob/master/SAFETY.md)
- [Documentação de configuração de modelos](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/providers.md)
- [Implantação com proxy](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/public-deployments.md)
