# Produção com o banco Neon existente

`compose.neon.yml` publica API e frontend com Caddy/HTTPS. O banco continua no Neon: não há serviço PostgreSQL nem volume de dados da aplicação neste Compose. A conexão da API usa pooling; o serviço de migração recebe a conexão direta do mesmo endpoint, banco e usuário.

## Configurar no servidor

O servidor precisa de Docker Engine, Compose v2, Node 24 para os scripts operacionais, acesso de saída ao Neon/SMTP, DNS do domínio apontando para ele e portas 80/443 liberadas. Hospedagens que gerenciam containers individualmente devem configurar as mesmas variáveis e executar a migração antes de iniciar a API.

1. Copie `.env.neon.production.example` para `.env.neon.production`. Esse arquivo real é ignorado pelo Git; configure-o no servidor, não no repositório. Em Linux, use `chmod 600 .env.neon.production`.
2. No console do Neon, selecione a branch e o banco existentes. Copie a URL com **Connection pooling ativado** para `DATABASE_URL` e a URL com **Connection pooling desativado** para `DIRECT_DATABASE_URL`. Preserve `sslmode=require` e os parâmetros fornecidos pelo Neon. Use aspas simples ao preencher URLs/senhas no arquivo para evitar a interpolação de `$` pelo Compose.
3. Configure domínio, e-mail operacional, tag de release, SMTP e `JWT_SECRET` exclusivo de produção. Gere o segredo com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
4. Confira a rede `172.30.0.0/24`; ao alterá-la, ajuste também o IP do Caddy e `TRUST_PROXY`. Este Compose usa o projeto `acks-neon`; execute somente uma instalação que publique as portas 80/443 no mesmo servidor.
5. Rode a validação sem conexão com o banco:

```sh
node scripts/preflight.cjs .env.neon.production --neon
docker compose --env-file .env.neon.production -f compose.neon.yml config --quiet
```

O preflight rejeita URLs sem TLS, pooling na conexão de migração e endpoints/bancos/usuários diferentes. Ele considera as variáveis da sessão que substituem o arquivo. O comando `config --quiet` evita imprimir as credenciais resolvidas.

## Backup e homologação antes da publicação

Confirme a versão principal do PostgreSQL do Neon. O cliente de `pg_dump` deve ter versão igual ou superior à do servidor. O script usa `postgres:17-alpine` por padrão; se necessário, configure `ACKS_PG_IMAGE=postgres:18-alpine` com uma versão adequada antes de exportar e verificar.

```sh
node scripts/backup-neon.cjs create
node scripts/backup-neon.cjs verify backups/ARQUIVO.dump
```

`create` apenas lê o banco indicado pela conexão direta e produz um dump customizado com permissões restritas. A senha vai pelo ambiente do processo; não entra nos argumentos nem no log. O script não sobrescreve arquivos existentes e remove arquivos parciais quando a exportação falha. `verify` restaura em um container local descartável, sem rede, consulta contas/fichas e remove somente esse container. Não se conecta ao Neon e não restaura sobre o banco ativo.

Antes de aplicar migrações ao banco existente, teste-as numa branch/cópia de homologação do Neon. Configure as duas URLs dessa cópia num arquivo separado e execute os mesmos comandos com `--env-file CAMINHO`. Para exportar essa cópia, use `ACKS_NEON_ENV_FILE=CAMINHO`. Verifique também os recursos de recuperação disponíveis no seu plano e a retenção escolhida; um dump deve continuar disponível fora do servidor da aplicação.

## Primeira publicação

Após backup, restauração e homologação aprovados:

```sh
docker compose --env-file .env.neon.production -f compose.neon.yml build --pull
docker compose --env-file .env.neon.production -f compose.neon.yml up -d --wait --wait-timeout 180
```

`prisma migrate deploy` deve concluir antes da API iniciar. A API só fica pronta após consultar o banco; Caddy espera essa prontidão. Verifique HTTPS, `/api/ready`, login, cadastro, criação e salvamento de fichas, compras, permissões, exportação e entrega real de recuperação de senha. A disponibilidade do Neon, as regras de rede e a entrega SMTP precisam ser conferidas nesse ambiente.

Se houver o `P3018` já relatado para `20260928120000_production_hardening`, siga a [recuperação específica documentada](PRODUCAO.md#atualização-e-rollback), depois de ter um backup e conferir o destino. Não use `migrate reset` nem `db push` no banco de produção.

## Atualização e operação

Antes de atualizar, registre a tag anterior, exporte e verifique o backup. Preencha uma nova `RELEASE_TAG`, valide o arquivo, construa as imagens e rode:

```sh
docker compose --env-file .env.neon.production -f compose.neon.yml run --rm migrate
docker compose --env-file .env.neon.production -f compose.neon.yml up -d --no-deps --wait api web
docker compose --env-file .env.neon.production -f compose.neon.yml logs --since 30m api
```

Guarde as imagens da tag anterior. Rollback de imagens exige compatibilidade com o schema atual; não reverte migrações automaticamente. Para restaurar dados, use uma nova branch/banco, confira os dados restaurados e só depois altere as conexões.

Agende exportações diárias e antes de cada entrega, copie os dumps para armazenamento externo restrito e alerte quando o backup ficar atrasado. Configure um monitor externo de `/api/ready` com alerta após três falhas consecutivas. Defina destinatário dos alertas, retenção de backups e o tempo/perda de dados aceitáveis para recuperação. A configuração efetiva desses serviços depende da hospedagem escolhida.

## Validação automática

O CI tem um cenário de containers para banco local e outro para a conexão externa. O segundo usa PostgreSQL descartável na rede Docker para validar `compose.neon.yml`, migrações, prontidão, proxy e o script de exportação/restauração. Os testes nunca recebem URLs ou credenciais reais do Neon. Essa simulação não valida DNS/TLS/autenticação do serviço contratado.

Referências: [Neon com Prisma](https://neon.com/docs/guides/prisma) e [exportação de dados do Neon](https://neon.com/docs/guides/export-neon-postgres-compatible).
