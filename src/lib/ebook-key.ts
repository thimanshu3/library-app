export function isEbookKey(key: string): boolean {
  return /^(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|\d{13}-[a-zA-Z0-9_.-]{1,180})\.(pdf|epub)$/.test(key)
}
