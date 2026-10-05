import { createHash, randomBytes } from 'node:crypto'
import nodemailer from 'nodemailer'
import prisma from './prisma'

export const hashResetToken = (token: string) => createHash('sha256').update(token).digest('hex')
export const passwordResetConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM && process.env.PUBLIC_APP_URL && (!process.env.SMTP_USER || process.env.SMTP_PASS))
export async function sendPasswordReset(userId: string, email: string) {
  if (!passwordResetConfigured()) throw new Error('Password recovery SMTP is not configured.')
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashResetToken(token)
  // Only the digest is stored. Reset links never appear in application logs.
  await prisma.passwordReset.deleteMany({ where: { expiresAt: { lt: new Date() } } })
  await prisma.passwordReset.upsert({
    where: { userId },
    update: { tokenHash, expiresAt: new Date(Date.now() + 30 * 60_000) },
    create: { userId, tokenHash, expiresAt: new Date(Date.now() + 30 * 60_000) },
  })
  const url = new URL('/reset-password', process.env.PUBLIC_APP_URL)
  // A fragment keeps the token out of proxy/access logs and Referer headers.
  url.hash = token
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    requireTLS: process.env.NODE_ENV === 'production' && process.env.SMTP_SECURE !== 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    connectionTimeout: 10_000, socketTimeout: 15_000,
  })
  try {
    await transport.sendMail({ from: process.env.SMTP_FROM, to: email, subject: 'Redefinir senha — ACKS II',
      text: `Para redefinir sua senha, abra ${url.toString()}\nO link expira em 30 minutos e pode ser usado uma vez. Se você não fez a solicitação, ignore esta mensagem.` })
  } finally { transport.close() }
}
