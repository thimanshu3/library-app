import 'server-only'
// Retry an entire read snapshot once when a database socket/pool is transiently
// unavailable. Mutations need their own idempotency and conflict contracts.
export async function databaseRead<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await operation() }
    catch (error) {
      const value = error as { code?: string; errorCode?: string }
      if (attempt >= 1 || !['P1001','P1002','P1017','P2024'].includes(value?.code || value?.errorCode || '')) throw error
      await new Promise(resolve => setTimeout(resolve, 150))
    }
  }
}
