# Continuação — REZ A.I (14/10/2026)

## Ponto de parada
- Backend: usuário confirmou **116 testes OK** após correção de `owner_params`.
- Depois disso, foram enviados 5 commits para a preparação da integração PostgreSQL: `backend/db_admin.py` (CLI `--apply`/`--check`), `psycopg[binary]` em `backend/requirements.txt`, testes unitários e teste de integração opcional, além de instruções em `backend/db/README.md`.
- **Os testes novos ainda não foram executados/confirmados pelo usuário.** Total esperado: 125 testes, sendo o teste de PostgreSQL real ignorado se `REZ_TEST_DATABASE_ADMIN_URL` não estiver definido.
- Usuário está no **Windows**, pasta local `C:\Users\Migue e Biel\REZ-A.I`, PowerShell.
- Usuário começou a baixar `postgresql-18.6-5-windows-x64.exe` pelo site da EDB. O print mostrava o download em andamento. **Não há confirmação de instalação concluída, de criação do banco `rez_dev` ou de execução da migração.**

## Próximos passos ao retomar
1. Confirmar que o instalador terminou e orientar instalação gráfica (Server, pgAdmin 4, Command Line Tools, porta 5432; criar senha local sem compartilhá-la).
2. No pgAdmin, criar banco de desenvolvimento vazio `rez_dev`.
3. No projeto: `git pull origin main`; `cd backend`; `python -m pip install -r requirements.txt`; `python -m unittest discover -s tests -v`.
4. Configurar `REZ_DATABASE_ADMIN_URL` **somente na sessão local**, sem enviar senha para o chat, e executar `python db_admin.py --apply` uma única vez no banco vazio; depois `python db_admin.py --check`.
5. Rodar testes de integração reais em banco de desenvolvimento isolado, validar comportamento, e só depois desenvolver CRUD e isolamento multiusuário. RLS atual é default-deny sem políticas; **não publicar API nem usar credencial administrativa no servidor público**.

## Segurança
Não há login multiusuário nem proteção de `/chat` para internet. Não afirmar que o banco já está conectado ou que a aplicação está pronta para deploy. Não salvar credenciais no GitHub.
