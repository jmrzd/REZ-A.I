# PostgreSQL — fundação multiusuário da REZ A.I

O arquivo `migrations/001_initial.sql` define a **primeira versão do esquema**, não um banco já provisionado. Nenhuma conexão, conta, endpoint de cadastro, autenticação pública ou migração automática foi ativada nesta etapa.

## Estrutura

- `rez_users`: identidades UUID, e-mail único normalizado, hash opcional para futura integração (nunca senha em texto).
- `rez_conversations`: titularidade por `user_id`.
- `rez_messages`: chave estrangeira composta `(conversation_id, user_id)` garante que o autor/titular coincida com a conversa.
- `rez_sessions`: hash SHA-256 de token opaco, expiração e revogação; não armazena token original.

Todos os IDs são UUID fornecidos pelo serviço confiável. A geração, validação e vinculação das identidades ainda precisam ser implementadas.

## Segurança e liberação

As quatro tabelas têm **row-level security (RLS) ativado e forçado, sem políticas ainda**: acesso negado por padrão a usuários normais. O aplicativo **não deve conectar como superusuário, dono da migração ou papel com BYPASSRLS**. Para ativar leituras/escritas será necessário configurar papéis de banco de menor privilégio e políticas RLS baseadas em identidade autenticada verificada, compatíveis com o pool de conexões e transações.

`backend/db_queries.py` fornece modelos de consultas parametrizadas com `user_id` obrigatório em leituras, inserção de mensagem e exclusão de conversa. Esses modelos são **apenas instruções SQL**, não funções que consultam o banco. O `user_id` deve vir de sessão validada pelo servidor, **nunca** do corpo HTTP ou do modelo de IA. Identidade UUID por si só não prova autenticação.

Não executar esta migração contra um banco existente sem revisão e backups. Fazer a primeira implantação em PostgreSQL de desenvolvimento vazio, com usuário separado para migrações e para a aplicação; salvar `DATABASE_URL` somente em segredo de ambiente, jamais no GitHub. O SQL é PostgreSQL e ainda requer execução real para validar sintaxe, constraints, migrações e controle de acesso.

## Verificação desta etapa

`python -m unittest discover -s tests -v` a partir de `backend` verifica 12 invariantes estáticas; total esperado **116** testes após os 104 confirmados anteriormente.

**Pendente para integrar:** PostgreSQL de teste, migração com versionamento (por exemplo Alembic), transações/driver, CRUD real, RLS com políticas, autenticação HTTPS, isolamento multiusuário testado com contas distintas, auditoria e backups.


## Preparar PostgreSQL local no Windows (etapa de integração)

1. Instale PostgreSQL localmente (se ainda não estiver instalado) e crie um **banco novo, vazio e exclusivo para testes da REZ**, por exemplo `rez_dev`, usando ferramentas oficiais do PostgreSQL. **Não use banco com dados existentes.**
2. Na pasta `backend`, execute `python -m pip install -r requirements.txt`. Isso instala o driver PostgreSQL `psycopg` e as demais dependências.
3. No PowerShell, configure **apenas nesta sessão** uma URL de conexão para uma **conta administrativa do banco de desenvolvimento**, por exemplo:
   ```powershell
   $env:REZ_DATABASE_ADMIN_URL = "postgresql://USUARIO:SENHA@localhost:5432/rez_dev"
   ```
   Troque os valores pelos seus. Se a senha contiver caracteres especiais, codifique-os na URL. Nunca coloque a URL com senha em commits, capturas de tela ou arquivos compartilhados.
4. Com o banco vazio e a URL configurada, execute **uma única vez**:
   ```powershell
   python db_admin.py --apply
   ```
   O comando cria as quatro tabelas e verifica a ativação e imposição de RLS. Ele recusa executar quando já detecta tabelas REZ, para evitar reexecução acidental.
5. Verifique quantas vezes quiser:
   ```powershell
   python db_admin.py --check
   ```
6. Para executar também o teste contra o PostgreSQL real:
   ```powershell
   $env:REZ_TEST_DATABASE_ADMIN_URL = $env:REZ_DATABASE_ADMIN_URL
   python -m unittest discover -s tests -v
   Remove-Item Env:REZ_TEST_DATABASE_ADMIN_URL
   Remove-Item Env:REZ_DATABASE_ADMIN_URL
   ```
   O teste `test_db_integration` é pulado quando a variável exclusiva de testes não estiver definida. Os testes de unidade continuam funcionando sem PostgreSQL.

**Aviso de privilégios:** `REZ_DATABASE_ADMIN_URL` serve **apenas** para migração e inspeção. Nunca utilize essa credencial no backend servido à internet. As políticas RLS por usuário e um papel de banco com permissões mínimas ainda não foram implementados; logo, o app online ainda não deve acessar essas tabelas.

**Limitações:** o comando desta etapa não fornece CRUD, migrações incrementais, sessões persistentes nem cadastro/login web. Ele não faz backup, e o teste de integração verifica metadados de tabelas e RLS, **não** o isolamento de dados com duas contas reais. O banco real precisa ser instalado e executado pelo usuário em sua máquina ou num ambiente isolado; criar os arquivos no GitHub não provisiona o serviço.
