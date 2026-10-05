import { randomBytes } from 'node:crypto'
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import { hashPassword } from '../src/lib/security/password'

async function main() {
  const generate = process.argv.includes('--generate')
  const rotate = process.argv.includes('--rotate')
  const envPath = '.env.local'
  let existing = ''
  try { existing = await readFile(envPath, 'utf8') } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const hasCredential = ['LIBRARY_OWNER_PASSWORD_HASH', 'LIBRARY_SESSION_SECRET'].some(key => {
    const value = existing.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1].trim() || ''
    return value.replace(/^(['"])(.*)\1$/, '$2').length > 0
  })
  if (hasCredential && !rotate) {
    throw new Error('Owner settings already exist. Use --rotate to replace them and revoke all sessions.')
  }
  let name = 'owner'
  let password: string
  if (generate) {
    password = randomBytes(24).toString('base64url')
  } else {
    if (!process.stdin.isTTY) throw new Error('Run this command in a terminal, or use --generate.')
    let hidden = false
    const output = new Writable({ write(chunk, _encoding, callback) {
      if (!hidden) process.stdout.write(chunk)
      callback()
    } })
    const terminal = createInterface({ input: process.stdin, output, terminal: true })
    try {
      name = (await terminal.question('Owner name [owner]: ')).trim() || 'owner'
      process.stdout.write('Password (at least 12 characters; input is hidden): ')
      hidden = true
      password = await terminal.question('')
      process.stdout.write('\nConfirm password: ')
      const confirmation = await terminal.question('')
      process.stdout.write('\n')
      if (password !== confirmation) throw new Error('Passwords do not match.')
    } finally { terminal.close() }
  }
  if (!/^[a-zA-Z0-9_.-]{3,64}$/.test(name)) {
    throw new Error('Use 3–64 letters, digits, dots, underscores, or hyphens for the owner name.')
  }
  const values = {
    LIBRARY_OWNER_NAME: name,
    LIBRARY_OWNER_PASSWORD_HASH: await hashPassword(password),
    LIBRARY_SESSION_SECRET: randomBytes(48).toString('base64url')
  }
  for (const [key, value] of Object.entries(values)) {
    existing = existing.replace(new RegExp(`^${key}=.*(?:\\r?\\n|$)`, 'gm'), '')
    if (existing && !existing.endsWith('\n')) existing += '\n'
    existing += `${key}=${JSON.stringify(value)}\n`
  }
  await writeFile(envPath, existing, { mode: 0o600 })
  await chmod(envPath, 0o600)
  await mkdir('.local', { recursive: true, mode: 0o700 })
  if (generate) {
    await writeFile('.local/owner-credentials.txt', `Owner name: ${name}\nPassword: ${password}\n\nKeep this file private. Run pnpm auth:setup --rotate to choose a new password.\n`, { mode: 0o600 })
    await chmod('.local/owner-credentials.txt', 0o600)
    console.log('Owner settings saved. Your generated credentials are in .local/owner-credentials.txt (not tracked by Git).')
  } else {
    // Remove any obsolete generated credentials without displaying their contents.
    const { rm } = await import('node:fs/promises')
    await rm('.local/owner-credentials.txt', { force: true })
    console.log('Owner settings saved. Restart the application to use the new settings.')
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Setup failed.'); process.exitCode = 1 })
