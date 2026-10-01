# Produção na Vercel com Neon

O frontend Vue e a API Fastify são publicados juntos a partir da **raiz do repositório**, com `vercel.json`. Não configure `frontend` como Root Directory. O banco continua no Neon; o build não executa migrações nem importa dados.

## Configuração

Use Node.js 24.x e as configurações de build do `vercel.json`. `api/index.js` inicializa a API em uma função Node.js, sem abrir uma porta. O cliente Prisma é gerado no build; a função reutiliza a aplicação nas chamadas seguintes. `/api/*` vai para a API; outras rotas abrem a aplicação Vue.

Configure as variáveis na Vercel em **Settings → Environment Variables → Production**. O modelo está em [`.env.vercel.example`](../.env.vercel.example). Nunca coloque segredos em variáveis `VITE_*`.

- `DATABASE_URL`: conexão Neon com pooling, `sslmode=require`, `connection_limit=3` e `pool_timeout=20`.
- `JWT_SECRET`: 32 bytes aleatórios em hexadecimal, diferentes do segredo de desenvolvimento. Gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` e cadastre como Sensitive.
- `CORS_ORIGIN` e `PUBLIC_APP_URL`: mesma origem HTTPS pública, sem barra final; para este projeto, `https://acksii.vercel.app`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASS`: envio de recuperação de senha.

Valide uma cópia **local ignorada pelo Git**, preenchida com valores reais:

```powershell
Copy-Item .env.vercel.example .env.vercel
node scripts/preflight.cjs .env.vercel --vercel
```

### Resend

Crie sua conta em [Resend](https://resend.com), adicione e verifique um domínio que você controla em [Domains](https://resend.com/domains), e gere uma API key com permissão de envio para esse domínio. Os registros DNS de verificação pertencem ao seu domínio de e-mail; o endereço `*.vercel.app` não fornece acesso ao DNS para essa verificação.

Configure o [SMTP do Resend](https://resend.com/docs/send-with-smtp): `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER=resend`. `SMTP_PASS` é a API key; cadastre como Sensitive. `SMTP_FROM` deve ser um remetente do domínio verificado, por exemplo `ACKS II <conta@seu-dominio>`.

Faça um novo deploy depois de cadastrar as variáveis. Sem `SMTP_PASS` e um remetente válido, recuperação de senha permanece pendente de configuração. Confirme recebimento e uso do link com uma conta sua antes de abrir o serviço a outros usuários.

## Banco e atualizações

Antes de uma atualização com migrações, exporte o Neon e teste a restauração em banco isolado conforme [Produção com Neon](PRODUCAO_NEON.md). Aplique migrações com a URL direta do **mesmo** banco, sem pooling, em uma sessão protegida. Use `prisma migrate deploy`, nunca `migrate dev`, `db push` ou `migrate reset` em produção.

Os deploys não aplicam migrações automaticamente. Verifique se o histórico e o schema real correspondem à versão a publicar. Não configure previews com a URL do banco de produção: use um branch Neon separado e outro segredo JWT para testes de escrita.

## Publicação e verificação

```powershell
npx.cmd vercel login
npx.cmd vercel link --project acksii --scope laurowds-projects
npm.cmd run vercel:build
node scripts/check-vercel-build.cjs
npx.cmd vercel deploy --prod --skip-domain
```

Confira o deployment na Vercel antes de promovê-lo: `/api/health` e `/api/ready` devem responder 200; `/api/characters` sem autenticação deve responder 401; `/login` e rotas profundas devem abrir o frontend. Verifique cadastro/login/ficha e recuperação em um ambiente com banco isolado. O CI usa PostgreSQL descartável e executa os testes de API, Vue, Playwright e Cypress.

Após os testes e CI aprovados, promova a URL validada com `npx.cmd vercel promote <URL>`. A publicação automática por push está desativada em `vercel.json`: o GitHub executa o CI, e a versão validada é publicada pela CLI. Deploys de produção sem `--skip-domain` podem atualizar o endereço público imediatamente.

## Operação

Os workflows [Production backup](../.github/workflows/production-backup.yml) e [Production monitor](../.github/workflows/production-monitor.yml) operam no branch `master`. O backup está agendado diariamente às **03:41 de São Paulo (06:41 UTC)**. O monitor está agendado a cada hora, no minuto 17; confere API, conexão Neon, bloqueio de acesso anônimo, frontend e disponibilidade de um backup verificado das últimas 36 horas. Após três tentativas sem sucesso, o workflow falha. Os agendamentos do GitHub podem atrasar; para alertas em poucos minutos, adicione um monitor externo dedicado.

O backup usa `ACKS_NEON_BACKUP_URL` (conexão direta com TLS) e `ACKS_BACKUP_KEY` (32 bytes aleatórios hexadecimais), cadastrados como **Actions secrets** do repositório privado. Ele exporta o Neon somente por leitura, criptografa com AES-256-GCM, autentica a descriptografia e testa a restauração em um PostgreSQL local descartável sem rede. Só o arquivo criptografado é enviado como artifact, com retenção de **30 dias**. Nenhuma restauração é executada contra o Neon ativo. Falhas na exportação, criptografia, restauração ou armazenamento falham o workflow.

O primeiro backup e o monitor podem ser executados manualmente em **GitHub → Actions → Production backup/Production monitor → Run workflow**. Para receber avisos, habilite **Settings → Notifications → System → Actions → Only notify for failed workflows** na sua conta GitHub e mantenha as notificações do repositório ativadas. A entrega de notificações depende dessas preferências e do agendador GitHub; não há envio automático por SMTP pela aplicação.

**Guarde a chave de backup em um gerenciador de senhas fora do repositório e desta máquina.** A cópia local está em `.env.backup`, ignorada pelo Git. Perder a chave impede recuperar os artifacts; mudar a chave não recriptografa backups antigos. Na rotação, preserve a chave antiga até os artifacts correspondentes expirarem. O formato e os comandos de recuperação estão em [Backups automáticos](BACKUPS_AUTOMATICOS.md).

Confirme também a janela de restauração oferecida pelo seu plano Neon e acompanhe erros nos logs da Vercel. Artifacts são uma cópia fora da hospedagem da aplicação, mas dependem do acesso ao GitHub e expiram ou podem ser removidos com o workflow/repositório; mantenha uma segunda cópia se precisar de retenção maior ou independência do GitHub. A agenda diária permite até cerca de 24 horas de perda de dados; o tempo de recuperação depende da restauração e da alteração da conexão.

Para reverter a aplicação, use o rollback da Vercel para uma versão compatível com o schema atual. Rollback de código não desfaz migrações; restauração de dados exige procedimento próprio. Credenciais de Neon, JWT e SMTP devem ser rotacionadas na Vercel com redeploy.

Referências: [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js), [configuração do projeto](https://vercel.com/docs/project-configuration/vercel-json), [Neon com Prisma](https://neon.com/docs/guides/prisma).
