// Send an approved booking reply via SMTP. The draft's YAML frontmatter carries
// to/subject/inReplyTo; missing SMTP credentials degrade to a manual package.
import { readFileSync, existsSync } from 'node:fs'
import { buildManualPackage, parseFrontmatter, ensureEnv } from '../lib.mjs'

export async function publish(item) {
  const env = ensureEnv(['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'])
  const draftPath = (item.draftPaths ?? []).find((p) => p.endsWith('.md'))

  if (!draftPath || !existsSync(draftPath)) {
    return { status: 'failed', result: `Booking reply draft not found (draftPaths: ${item.draftPaths?.join(', ')})` }
  }
  const { meta, body } = parseFrontmatter(readFileSync(draftPath, 'utf8'))
  if (!meta.to || !meta.subject) {
    return { status: 'failed', result: `Draft ${draftPath} is missing "to:" or "subject:" frontmatter` }
  }

  if (!env.ok) {
    const dir = buildManualPackage(item, `SMTP not configured (${env.missing.join(', ')}) — send this reply from your mail client.`)
    return { status: 'published (manual)', result: `Manual send package at ${dir} (to: ${meta.to}).`, artifactPath: dir }
  }

  const nodemailer = (await import('nodemailer')).default
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  })
  const info = await transport.sendMail({
    from: process.env.SMTP_USER,
    to: meta.to,
    subject: meta.subject,
    inReplyTo: meta.inReplyTo || undefined,
    text: body,
  })
  return { status: 'published', result: `Sent to ${meta.to} (${info.messageId}).` }
}
