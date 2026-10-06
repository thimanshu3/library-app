'use client'
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates
} from 'nuqs'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ViewMode } from '../components/LibraryShared'
import type { Book } from '../types'

const modes: ViewMode[] = [
  'grid',
  'list',
  'alphabetic',
  'authors',
  'collections',
  'volumes',
  'analytics',
  'loans',
  'wishlist'
]
const workFields = [
  'title',
  'author',
  'genre',
  'hours',
  'recommendedBy',
  'volume',
  'photoUrl',
  'summary',
  'description',
  'launchYear',
  'originalLanguage',
  'countryOfOrigin',
  'authorDescription',
  'coverFile',
  'tags',
  'collections',
  'series',
  'apiData',
  'goodreadsId',
  'authorLF',
  'additionalAuthors',
  'originalPublicationYear',
  'ownedCopies',
  'workRevision'
] as const

export async function readApi<T>(
  url: string,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(url, { signal, cache: 'no-store' })
  const result = await response.json()
  if (!response.ok) {
    if (response.status === 401) {
      // A full navigation discards cached private state after session expiry.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign('/login')
    }
    throw new Error(result.error || 'Unable to load data. Please retry.')
  }
  return result as T
}

export function useLibrary(initial: {
  books: Book[]
  totalCount: number
  hasMore: boolean
  nextCursor: string | null
}) {
  const [filters, writeFilters] = useQueryStates(
    {
      search: parseAsString.withDefault(''),
      statusFilter: parseAsString.withDefault('All'),
      volumeFilter: parseAsString.withDefault('All'),
      genreFilter: parseAsString.withDefault('All'),
      authorFilter: parseAsString.withDefault('All'),
      yearFilter: parseAsString.withDefault('All'),
      formatFilter: parseAsString.withDefault('All'),
      purchasedFilter: parseAsString.withDefault('All'),
      shelfFilter: parseAsString.withDefault('All'),
      sortBy: parseAsString.withDefault('id'),
      viewMode: parseAsStringLiteral(modes).withDefault('grid'),
      skip: parseAsInteger.withDefault(0)
    },
    { history: 'push' }
  )
  const [books, setBooks] = useState(initial.books)
  const [allBooks, setAllBooks] = useState<Book[]>([])
  const [annualGoal, setAnnualGoal] = useState(50)
  const [totalCount, setTotalCount] = useState(initial.totalCount)
  const [hasMore, setHasMore] = useState(initial.hasMore)
  const [loading, setLoading] = useState(false)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [error, setError] = useState('')
  const [overviewError, setOverviewError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const queryKey = JSON.stringify(filters)
  const initialPending = useRef(true)
  const generation = useRef(0)
  const cursor = useRef(initial.nextCursor)
  const paging = useRef(false)
  const currentKey = useRef(queryKey)
  const observerTarget = useRef<HTMLDivElement>(null)

  const setFilters = useCallback(
    (values: Partial<typeof filters> | null) => {
      return writeFilters(values === null ? null : { ...values, skip: 0 })
    },
    [writeFilters]
  )
  const setViewMode = useCallback(
    (viewMode: ViewMode) => {
      void setFilters({ viewMode })
    },
    [setFilters]
  )
  const refresh = useCallback(() => {
    setRefreshKey(value => value + 1)
  }, [])

  const refreshOverview = useCallback(async (signal?: AbortSignal) => {
    await Promise.resolve()
    if (signal?.aborted) return
    setOverviewLoading(true)
    try {
      const data = await readApi<{ books: Book[]; annualGoal: number }>(
        '/api/library/overview',
        signal
      )
      setAllBooks(data.books)
      setAnnualGoal(data.annualGoal)
      setOverviewError('')
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        setOverviewError(
          error instanceof Error
            ? error.message
            : 'Unable to load library totals.'
        )
    } finally {
      if (!signal?.aborted) setOverviewLoading(false)
    }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      void refreshOverview(controller.signal)
    }, 0)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [refreshOverview])

  useEffect(() => {
    const token = ++generation.current
    currentKey.current = queryKey
    paging.current = false
    if (initialPending.current && refreshKey === 0) {
      initialPending.current = false
      return
    }
    const controller = new AbortController()
    const query = new URLSearchParams(JSON.parse(queryKey))
    query.set('take', '20')
    Promise.resolve().then(() => {
      if (!controller.signal.aborted) setLoading(true)
    })
    readApi<typeof initial>(`/api/library?${query}`, controller.signal)
      .then(data => {
        if (token !== generation.current) return
        setBooks(data.books)
        setTotalCount(data.totalCount)
        setHasMore(data.hasMore)
        cursor.current = data.nextCursor
        setError('')
      })
      .catch(error => {
        if (token === generation.current && !controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : 'Unable to load the library.'
          )
      })
      .finally(() => {
        if (token === generation.current) setLoading(false)
      })
    return () => controller.abort()
  }, [queryKey, refreshKey])

  const loadMore = useCallback(async () => {
    if (paging.current || loading || !hasMore || !cursor.current) return
    const token = generation.current
    const key = currentKey.current
    paging.current = true
    setLoading(true)
    try {
      const query = new URLSearchParams(JSON.parse(key))
      query.delete('skip')
      query.set('cursor', cursor.current)
      query.set('take', '20')
      const data = await readApi<typeof initial>(`/api/library?${query}`)
      if (token !== generation.current || key !== currentKey.current) return
      setBooks(previous => {
        const ids = new Set(previous.map(book => book.id))
        return [...previous, ...data.books.filter(book => !ids.has(book.id))]
      })
      setTotalCount(data.totalCount)
      setHasMore(data.hasMore)
      cursor.current = data.nextCursor
      setError('')
    } catch (error) {
      if (token === generation.current)
        setError(
          error instanceof Error ? error.message : 'Unable to load more books.'
        )
    } finally {
      if (token === generation.current) {
        paging.current = false
        setLoading(false)
      }
    }
  }, [loading, hasMore])

  useEffect(() => {
    const target = observerTarget.current
    if (!target || ['analytics', 'loans'].includes(filters.viewMode)) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { rootMargin: '200px' }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [loadMore, filters.viewMode])

  const commit = useCallback((saved: Book) => {
    const merge = (rows: Book[]) =>
      rows.map(book => {
        if (book.id === saved.id) return saved
        if (book.workId !== saved.workId) return book
        const shared = Object.fromEntries(
          workFields.map(field => [field, saved[field]])
        )
        return { ...book, ...shared }
      })
    setBooks(merge)
    setAllBooks(previous =>
      previous.some(book => book.id === saved.id)
        ? merge(previous)
        : [...merge(previous), saved]
    )
  }, [])

  const getBook = useCallback(
    (id: string) =>
      readApi<Book>(`/api/library/books/${encodeURIComponent(id)}`),
    []
  )
  return {
    filters,
    setFilters,
    viewMode: filters.viewMode,
    setViewMode,
    books,
    setBooks,
    allBooks,
    totalCount,
    hasMore,
    loading,
    overviewLoading,
    error: error || overviewError,
    annualGoal,
    setAnnualGoal,
    refresh,
    refreshOverview,
    observerTarget,
    loadMore,
    commit,
    getBook
  }
}
