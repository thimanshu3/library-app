if (!process.env.npm_config_user_agent?.startsWith('pnpm/')) {
  console.error('Install with pnpm to preserve the reviewed dependency patches and pnpm lockfile.')
  process.exitCode = 1
}
