interface Enrichment { bookKey: string; description?: string; authorDescription?: string }
const cache = new Map<string, Enrichment>()
export function deliverEnrichment(data: Enrichment) {
  const previous = cache.get(data.bookKey)
  cache.set(data.bookKey, { ...previous, ...data })
  if (cache.size > 20) cache.delete(cache.keys().next().value!)
  window.dispatchEvent(new CustomEvent('wiki-enrichment', { detail: data }))
}
export function cachedEnrichment(key: string) { return cache.get(key) }
