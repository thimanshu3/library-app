import { Suspense } from 'react';
import LibraryClient from './LibraryClient';
import { fetchFilteredBooksAction } from './actions';
import { getOwner } from '@/lib/server/auth';
import { HttpError } from '@/lib/server/http';
import { redirect } from 'next/navigation';

async function LibraryContent({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  let owner;
  try {
    owner = await getOwner();
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 503) throw error;
  }
  if (!owner) redirect('/login');
  const params = await searchParams;

  const search = typeof params.search === 'string' ? params.search : undefined;
  const statusFilter = typeof params.statusFilter === 'string' ? params.statusFilter : undefined;
  const volumeFilter = typeof params.volumeFilter === 'string' ? params.volumeFilter : undefined;
  const genreFilter = typeof params.genreFilter === 'string' ? params.genreFilter : undefined;
  const authorFilter = typeof params.authorFilter === 'string' ? params.authorFilter : undefined;
  const yearFilter = typeof params.yearFilter === 'string' ? params.yearFilter : undefined;
  const formatFilter = typeof params.formatFilter === 'string' ? params.formatFilter : undefined;
  const purchasedFilter = typeof params.purchasedFilter === 'string' ? params.purchasedFilter : undefined;
  const shelfFilter = typeof params.shelfFilter === 'string' ? params.shelfFilter : undefined;
  const sortBy = typeof params.sortBy === 'string' ? params.sortBy : undefined;
  const skip = typeof params.skip === 'string' ? Number(params.skip) : 0;
  const viewMode = typeof params.viewMode === 'string' ? params.viewMode : 'grid';
  
  const result = await fetchFilteredBooksAction({
    search,
    statusFilter,
    volumeFilter,
    genreFilter,
    authorFilter,
    yearFilter,
    formatFilter,
    purchasedFilter,
    shelfFilter,
    sortBy,
    skip,
    take: 20,
    viewMode
  });
  if (result.error || !result.books) throw new Error(result.error || 'Unable to load the library.');

  return (
    <LibraryClient 
      initialBooks={result.books}
      initialTotalCount={result.totalCount || 0}
      initialHasMore={result.hasMore || false}
      initialNextCursor={result.nextCursor}
    />
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-slate-900 text-slate-400 font-medium">
        Loading Library...
      </div>
    }>
      <LibraryContent searchParams={searchParams} />
    </Suspense>
  );
}
