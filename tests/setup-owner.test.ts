import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, beforeEach, expect, it } from 'vitest'

const run = promisify(execFile)
const cli = fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url))
const script = fileURLToPath(new URL('../scripts/setup-owner.ts', import.meta.url))
let directory: string
beforeEach(async () => { directory = await mkdtemp(path.join(tmpdir(), 'library-owner-setup-test-')) })
afterEach(async () => { await rm(directory, { recursive: true, force: true }) })

it('initializes example settings privately, preserves database settings, and requires explicit credential rotation', async () => {
  const databaseSetting = 'DATABASE_URL="postgresql://test-only:preserve-me@localhost/library"\n'
  await writeFile(path.join(directory, '.env.local'), databaseSetting + 'LIBRARY_OWNER_NAME=owner\nLIBRARY_OWNER_PASSWORD_HASH=\nLIBRARY_SESSION_SECRET=""\n')
  const initial = await run(process.execPath, [cli, script, '--generate'], { cwd: directory })
  const envPath = path.join(directory, '.env.local')
  const credentialPath = path.join(directory, '.local/owner-credentials.txt')
  const first = await readFile(envPath, 'utf8')
  const credentials = await readFile(credentialPath, 'utf8')
  const password = credentials.match(/^Password: (.+)$/m)![1]
  expect(first).toContain(databaseSetting)
  expect(first).toMatch(/LIBRARY_OWNER_PASSWORD_HASH="scrypt:/)
  expect(first).not.toContain(password)
  expect(initial.stdout).not.toContain(password)
  expect((await stat(envPath)).mode & 0o777).toBe(0o600)
  expect((await stat(credentialPath)).mode & 0o777).toBe(0o600)
  await expect(run(process.execPath, [cli, script, '--generate'], { cwd: directory })).rejects.toMatchObject({ code: 1 })
  expect(await readFile(envPath, 'utf8')).toBe(first)
  await run(process.execPath, [cli, script, '--generate', '--rotate'], { cwd: directory })
  const rotated = await readFile(envPath, 'utf8')
  expect(rotated).not.toBe(first)
  expect(rotated).toContain(databaseSetting)
  expect(rotated.match(/^LIBRARY_OWNER_PASSWORD_HASH=/gm)).toHaveLength(1)
  expect(rotated.match(/^LIBRARY_SESSION_SECRET=/gm)).toHaveLength(1)
})
