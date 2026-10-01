export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const production = env.NODE_ENV === 'production'
  const secret = env.JWT_SECRET || ''
  if (!secret.trim() || (production && (secret.trim().length < 32 || /change-this|sua-chave/i.test(secret)))) throw new Error('Configure JWT_SECRET com pelo menos 32 caracteres em produção.')
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required.')
  const port = Number(env.PORT || 3001)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.')
  const origin = env.CORS_ORIGIN || 'http://localhost:5173'
  const publicUrl = env.PUBLIC_APP_URL || origin
  for (const value of [origin, publicUrl]) {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value || (production && url.protocol !== 'https:')) throw new Error('CORS_ORIGIN and PUBLIC_APP_URL must be origins, using HTTPS in production.')
  }
  const trustProxy = env.TRUST_PROXY ? env.TRUST_PROXY.split(',').map(value => value.trim()) : false
  if (trustProxy && trustProxy.some(value => ['true', '*', '0.0.0.0/0', '::/0'].includes(value))) throw new Error('TRUST_PROXY must contain only trusted proxy addresses/CIDRs.')
  return { production, secret, port, origin, publicUrl, trustProxy }
}
