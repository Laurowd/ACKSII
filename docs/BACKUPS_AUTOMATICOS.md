# Backups automáticos do Neon

O workflow `Production backup` lê o banco Neon existente pela URL direta, exporta um dump PostgreSQL customizado, criptografa e testa a recuperação em um container local isolado. O resultado criptografado fica no repositório **privado** em **Actions → Production backup → execução aprovada → Artifacts**, por 30 dias.

## Recuperar a cópia

1. Baixe o artifact de uma execução aprovada e extraia `neon.dump.enc` para uma pasta protegida.
2. Recupere `ACKS_BACKUP_KEY` do seu gerenciador de senhas. A chave cadastrada inicialmente está também na cópia local `.env.backup`, que é ignorada pelo Git. Não cole a chave no terminal com histórico, em issues ou no chat.
3. Carregue a chave no ambiente em uma sessão protegida. Em PowerShell, para usar a cópia local sem exibir seu conteúdo:

```powershell
$backupLine = Get-Content -LiteralPath .env.backup | Where-Object { $_ -match '^ACKS_BACKUP_KEY=' }
$env:ACKS_BACKUP_KEY = ($backupLine -split '=', 2)[1]
node scripts/backup-cipher.cjs decrypt backups/neon.dump.enc backups/recovered.dump
Remove-Item Env:ACKS_BACKUP_KEY
```

4. Teste a restauração local (Docker precisa estar instalado):

```powershell
node scripts/backup-neon.cjs verify backups/recovered.dump
```

A descriptografia exige autenticação AES-GCM; chave errada ou arquivo alterado não produzem um dump final. Os comandos recusam sobrescrever arquivos existentes. O dump descriptografado contém dados privados: restrinja acesso e remova a cópia após concluir a recuperação.

## Restaurar o serviço

Restaure o dump em **uma nova branch/banco Neon**, usando cliente PostgreSQL 17 ou compatível, `pg_restore --exit-on-error --no-owner --no-acl` e a conexão direta com TLS passada pelo ambiente. Nunca restaure por cima do banco ativo como tentativa de teste. Confira schema, contas, campanhas e fichas no banco recuperado antes de trocar `DATABASE_URL` na Vercel. Se aplicar migrações, teste a mesma versão da aplicação contra a cópia recuperada antes da troca. Execute novo deploy para carregar a nova conexão.

Registre qual backup foi usado, confirme a integridade e o horário dos dados recuperados e confira `/api/ready` e os fluxos do sistema após a troca. A janela diária de exportação pode perder alterações posteriores ao último backup; verifique se a restauração temporal do plano Neon cobre melhor o incidente.

## Segredos e falhas

- `ACKS_NEON_BACKUP_URL`: Actions secret com a conexão direta do Neon. Ao rotacionar a credencial do banco, atualize também este secret.
- `ACKS_BACKUP_KEY`: Actions secret usado para criptografar e validar cada backup. Guarde a chave separadamente; apenas o artifact não permite recuperação.
- O monitor sinaliza quando não existe uma execução de backup aprovada com artifact disponível nas últimas 36 horas. Falhas também aparecem diretamente no workflow de backup.
- Não altere a privacidade do repositório nem distribua os artifacts. Os arquivos criptografados são a única cópia enviada ao GitHub; exportação e restauração temporárias ficam no runner e são removidas no fim do job.

Para pausar a agenda sem apagar arquivos de backup, desabilite o workflow na interface Actions. A programação GitHub é de melhor esforço, e os limites de minutos e armazenamento do seu plano podem interrompê-la. Monitore o consumo em Billing; retenção maior e verificação mais frequente consomem mais recursos.

Referências: [Artifacts e retenção](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts), [notificações de Actions](https://docs.github.com/en/subscriptions-and-notifications/how-tos/managing-github-actions-notifications), [exportação Neon](https://neon.com/docs/guides/export-neon-postgres-compatible).
