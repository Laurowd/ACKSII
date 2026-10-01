# Implantação e operação

O Compose publica Caddy (frontend, HTTPS e proxy `/api`), Fastify e PostgreSQL. Somente portas 80/443 são públicas. Rotas do Vue têm fallback para `index.html`. O banco existente no Neon não é usado automaticamente: esta configuração cria um banco próprio.

## Preparar o servidor

1. Instale Docker Engine e Compose v2, configure DNS do domínio e libere TCP 80/443 (UDP 443 é opcional).
2. Copie `.env.production.example` para `.env.production` e preencha os valores. Gere cada segredo separadamente com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Use senha hexadecimal no Compose para evitar problemas de codificação na URL do banco. Em Linux, restrinja o arquivo com `chmod 600 .env.production`.
3. Configure SMTP e remetente no provedor. Porta 587 usa STARTTLS; porta 465 exige `SMTP_SECURE=true`. A produção exige TLS. Sem SMTP funcional, recuperação de senha não entrega mensagens; a API registra a falha sem expor o token.
4. Confira que `172.30.0.0/24` não conflita com a rede do servidor. Se alterar essa rede, ajuste também o IP fixo do Caddy e `TRUST_PROXY`. Nunca confie em todos os proxies nem exponha diretamente a API.
5. Versione código, lockfiles, migrações e pipeline revisados em repositório privado, sem `.env`, backups e ferramentas temporárias. Confirme autorização antes de distribuir os textos do compêndio. Use uma tag por entrega e preencha `RELEASE_TAG`.

Contas de provedores, DNS, envio real de e-mail e publicação devem ser configurados no ambiente escolhido. O pipeline não publica automaticamente.

## Primeira instalação

Na raiz, com `.env.production` preenchido:

```sh
node scripts/preflight.cjs .env.production
docker compose --env-file .env.production config --quiet
docker compose --env-file .env.production build --pull
docker compose --env-file .env.production up -d --wait --wait-timeout 180
```

O preflight confere domínio, tag imutável, segredos independentes e configuração SMTP sem mostrar seus valores nem fazer conexões. Ele considera variáveis de mesmo nome já definidas na sessão, pois elas também substituem o arquivo no Compose. O banco precisa estar saudável e `prisma migrate deploy` precisa concluir antes da API iniciar. Caddy espera a API ficar pronta e o próprio container web tem uma verificação interna. Verifique `/api/ready`, cadastro, login, criação, compra, salvamento, exportação e entrega real de recuperação de senha.

Para preservar uma instalação existente, faça backup e restaure uma cópia em homologação primeiro. Para usar banco externo, adapte a URL e remova a dependência do serviço `db`. Os scripts de backup abaixo atendem ao PostgreSQL deste Compose, não ao Neon.

## Atualização e rollback

```sh
node scripts/backup.cjs create
node scripts/backup.cjs verify backups/ARQUIVO.dump
docker compose --env-file .env.production build --pull
docker compose --env-file .env.production run --rm migrate
docker compose --env-file .env.production up -d --no-deps --wait api web
```

Guarde as imagens anteriores e registre sua tag antes de atualizar. A migração `20260928120000_production_hardening` adiciona versão das fichas, revogação de sessões, recuperação de senha e limite compartilhado. Ela precede a API nova e não usa `migrate reset`. Sessões antigas exigirão novo login; clientes antigos sem `version` recebem 400 ao salvar.

Se o Prisma retornar `P3018` e identificar **exatamente** `20260928120000_production_hardening` porque `Character.version` já existia, não apague dados nem edite o histórico no banco. Primeiro faça um backup do provedor e confirme que `DATABASE_URL` aponta para o banco pretendido. A migração atual pode ser reaplicada com segurança; marque somente essa tentativa falha como revertida e execute novamente:

```sh
cd backend
npx prisma migrate resolve --rolled-back 20260928120000_production_hardening
npx prisma migrate deploy
npx prisma migrate status
```

Use esse procedimento apenas para o nome exato informado acima e após o backup. Se a mensagem ou a migração for outra, investigue-a separadamente. Nunca use `prisma migrate reset` em produção.

Para voltar imagens, configure `RELEASE_TAG` anterior e execute `docker compose --env-file .env.production up -d --no-deps --no-build api web`, somente após conferir compatibilidade com o schema atual. Voltar à versão anterior a esta entrega também remove as novas proteções de sessão/salvamento; prefira corrigir adiante ou interromper o acesso durante recuperação. Nunca execute `down --volumes` em produção.

## Backups e restauração

- `node scripts/backup.cjs create` grava um dump binário em `backups/`, sem conversão de encoding pelo PowerShell. Um caminho opcional, como `node scripts/backup.cjs create /mnt/backup/acks.dump`, permite escolher o destino; um arquivo existente nunca é sobrescrito.
- `node scripts/backup.cjs verify backups/ARQUIVO.dump` restaura em outro banco temporário, verifica tabelas e remove somente esse banco de verificação. Não sobrescreve o banco ativo.
- O script rejeita arquivos vazios ou que não tenham o formato customizado do PostgreSQL e remove a extensão `.partial` quando o `pg_dump` falha. A verificação por restauração continua obrigatória; a assinatura do formato não prova que o dump inteiro está íntegro.
- Agende backups diários e antes das entregas. Copie-os para armazenamento fora do servidor, com acesso restrito e retenção definida. Volume Docker não substitui backup.
- Verifique restauração periodicamente e defina perda máxima aceitável de dados e tempo de recuperação.
- Em corrupção, interrompa escritas, restaure em um banco novo, confira contas/fichas e só então altere a conexão. Recuperar um backup antigo exige decidir o destino das alterações posteriores a ele.

## Monitoramento

- `/api/health`: processo vivo. `/api/ready`: consulta PostgreSQL e retorna 503 em falha. O Caddy também responde em `/health` na porta interna 8080 apenas para o `HEALTHCHECK`; essa porta não é publicada pelo Compose.
- Configure monitor externo a cada minuto, com alerta após três falhas. O operador precisa escolher serviço e destinatário.
- Consulte logs com `docker compose --env-file .env.production logs --since 30m api`. Há rotação de logs, ocultação de tokens/cookies e respostas 500 sem detalhes internos.
- Monitore disco, memória, 5xx, latência, falhas SMTP e idade do último backup. `restart: unless-stopped` recupera processos encerrados; Docker não reinicia automaticamente um container apenas `unhealthy`.
- Requisições são drenadas antes de desconectar o Prisma. Prazo de encerramento: 25 segundos; tolerância no Compose: 30 segundos.
- Em produção, o limitador usa PostgreSQL, com atualização atômica entre réplicas e limpeza de registros vencidos. Desenvolvimento usa memória limitada.
- Tokens expiram em 12 horas. Sair ou redefinir senha revoga todas as sessões da conta. Links de recuperação duram 30 minutos, são de uso único e só o hash fica no banco.

## Homologação e testes

Use Node 24 LTS e `npm ci` em ambas as pastas. O override de `deepmerge-ts` corrige a dependência do Prisma 6; reavalie-o ao atualizar Prisma. Geração do cliente e migrações são verificadas nos testes.

Integração e navegador recusam executar sem `TEST_DATABASE_URL` apontando para `localhost`/`127.0.0.1`, banco `acks_test`. Não usam `.env` como fallback. Prepare um PostgreSQL descartável e rode:

```sh
export TEST_DATABASE_URL=postgresql://acks_test:local-test-only@127.0.0.1:5432/acks_test
npm run build --prefix backend
npm run build --prefix frontend
npm run test:integration --prefix backend
cd frontend
npx playwright install chromium
npm run test:e2e
```

PowerShell: use `$env:TEST_DATABASE_URL='...'`. Para Edge instalado, use `$env:PLAYWRIGHT_CHANNEL='msedge'`.

Para testar com a aplicação de desenvolvimento aberta, defina também `$env:TEST_API_PORT='3109'` e `$env:TEST_WEB_PORT='4175'` antes de `npm.cmd run test:e2e`. A API, o proxy e o navegador de teste usam essas portas; os padrões continuam 3001 e 4173. Os testes não reutilizam um servidor existente.

O CI usa PostgreSQL real e navegador. O executável do Cypress é baixado somente no passo que o utiliza, não durante o build da imagem estática. Outro job valida a configuração, constrói/inicia containers, espera pelos `HEALTHCHECK`, verifica proxy, fallback e headers, e exercita o mesmo script de backup/restauração entregue ao operador. `compose.test.yml` habilita HTTP somente nesse projeto descartável; nunca o use em produção. Testes com PostgreSQL portátil não substituem validação dos containers e serviços contratados.

## Critérios de abertura

- CI aprovado e imagens identificadas pela tag revisada.
- Fluxos e permissões aprovados em homologação.
- Backup externo e restauração comprovados no ambiente escolhido.
- DNS, HTTPS, SMTP e alertas verificados de ponta a ponta.
- Limitações das regras aceitas: consulte [fluxos e alcance da automação](FLUXOS_ACKS_II.md). Templates e todas as exceções de ACKS II não são automatizados; o construtor por pontos cobre as categorias e trocas iniciais documentadas.
