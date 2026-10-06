import { config } from 'dotenv'
import { spawnSync } from 'node:child_process'
config({ path: '.env.local', quiet: true }); config({ path: '.env', quiet: true })
const result = spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], { stdio: 'inherit', env: process.env })
process.exitCode = result.status || (result.error ? 1 : 0)
