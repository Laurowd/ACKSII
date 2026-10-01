// Validates production settings without printing secrets or contacting services.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const knownKeys = [
  'APP_DOMAIN', 'ACME_EMAIL', 'RELEASE_TAG', 'POSTGRES_PASSWORD', 'JWT_SECRET',
  'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_FROM', 'SMTP_USER', 'SMTP_PASS',
];

function parseEnv(source) {
  const values = {};
  const errors = [];
  for (const [index, original] of source.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    const line = original.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) {
      errors.push(`linha ${index + 1}: formato inválido`);
      continue;
    }
    const [, key] = match;
    let value = match[2].trim();
    if (Object.hasOwn(values, key)) {
      errors.push(`linha ${index + 1}: ${key} está repetida`);
      continue;
    }
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    values[key] = value;
  }
  return { values, errors };
}

function isHostname(value) {
  if (value.length > 253 || !value.includes('.') || /[:/?#]/.test(value)) return false;
  const labels = value.split('.');
  return labels.every(label => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label));
}

function isEmail(value) {
  return /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value);
}

function emailAddress(value) {
  return (value.match(/<([^<>]+)>/) || [null, value])[1];
}

function isReservedEmail(value) {
  return /@(?:[^@]+\.)?(?:example\.(?:com|net|org)|example|invalid|localhost|test)$/i.test(value);
}

function validate(values) {
  const errors = [];
  const required = ['APP_DOMAIN', 'ACME_EMAIL', 'RELEASE_TAG', 'POSTGRES_PASSWORD', 'JWT_SECRET', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_FROM'];
  for (const key of required) if (!values[key]?.trim()) errors.push(`${key}: valor obrigatório`);

  const domain = values.APP_DOMAIN || '';
  if (domain && (!isHostname(domain) || /(?:^|\.)(?:example\.(?:com|net|org)|example|invalid|localhost|test)$/i.test(domain))) {
    errors.push('APP_DOMAIN: use um hostname público real, sem protocolo, porta ou caminho');
  }
  if (values.ACME_EMAIL && (!isEmail(values.ACME_EMAIL) || isReservedEmail(values.ACME_EMAIL))) errors.push('ACME_EMAIL: use um endereço real do responsável pela operação');
  if (values.RELEASE_TAG && (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(values.RELEASE_TAG) || /^(?:latest|local|ci)$/i.test(values.RELEASE_TAG))) {
    errors.push('RELEASE_TAG: use uma versão imutável, sem espaços (por exemplo, 2026.10.01-1)');
  }

  for (const key of ['POSTGRES_PASSWORD', 'JWT_SECRET']) {
    const value = values[key] || '';
    if (value && !/^[a-f0-9]{64}$/i.test(value)) errors.push(`${key}: gere exatamente 32 bytes aleatórios em hexadecimal (64 caracteres)`);
  }
  if (values.POSTGRES_PASSWORD && values.POSTGRES_PASSWORD === values.JWT_SECRET) {
    errors.push('JWT_SECRET: deve ser diferente de POSTGRES_PASSWORD');
  }

  if (values.SMTP_HOST && (/[\s/:]/.test(values.SMTP_HOST) || /example|localhost/i.test(values.SMTP_HOST))) {
    errors.push('SMTP_HOST: use apenas o hostname real do servidor SMTP');
  }
  const smtpPort = Number(values.SMTP_PORT);
  if (values.SMTP_PORT && (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535)) errors.push('SMTP_PORT: use uma porta entre 1 e 65535');
  if (values.SMTP_SECURE && !['true', 'false'].includes(values.SMTP_SECURE)) errors.push('SMTP_SECURE: use true ou false em letras minúsculas');
  if (smtpPort === 465 && values.SMTP_SECURE !== 'true') errors.push('SMTP_SECURE: a porta 465 exige true');
  if (values.SMTP_FROM && (!isEmail(emailAddress(values.SMTP_FROM)) || isReservedEmail(emailAddress(values.SMTP_FROM)))) {
    errors.push('SMTP_FROM: use um e-mail ou Nome <email@dominio>');
  }
  if (Boolean(values.SMTP_USER) !== Boolean(values.SMTP_PASS)) errors.push('SMTP_USER e SMTP_PASS: configure ambos ou deixe ambos vazios');

  return errors;
}

function run(argv = process.argv, environment = process.env, platform = process.platform, output = console) {
  const file = path.resolve(root, argv[2] || '.env.production');
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) throw new Error('o caminho não aponta para um arquivo regular');
    const parsed = parseEnv(fs.readFileSync(file, 'utf8'));
    const values = { ...parsed.values };
    const overrides = [];
    for (const key of knownKeys) {
      if (environment[key] !== undefined) {
        values[key] = environment[key];
        overrides.push(key);
      }
    }
    const errors = [...parsed.errors, ...validate(values)];
    if (platform !== 'win32' && (stat.mode & 0o077) !== 0) errors.push('permissões: restrinja o arquivo com chmod 600');
    if (errors.length) {
      output.error('Preflight de produção falhou:');
      for (const error of errors) output.error(`- ${error}`);
      return false;
    }
    output.log('Preflight aprovado: configuração local consistente; nenhum segredo foi exibido e nenhuma conexão externa foi feita.');
    if (overrides.length) output.log(`Variáveis da sessão consideradas: ${overrides.join(', ')}.`);
    return true;
  } catch (error) {
    const reason = error && error.code === 'ENOENT' ? 'arquivo não encontrado' : (error instanceof Error ? error.message : String(error));
    output.error(`Preflight de produção falhou: ${reason}.`);
    return false;
  }
}

if (require.main === module) process.exitCode = run() ? 0 : 1;

module.exports = { parseEnv, validate, run };
