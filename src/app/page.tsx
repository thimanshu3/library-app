import { Suspense } from 'react';
import LibraryClient from './LibraryClient';
import { fetchFilteredBooksAction } from './actions';

async function LibraryContent({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
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
  const skip = typeof params.skip === 'string' ? parseInt(params.skip, 10) : 0;
  
  const { books = [], totalCount = 0 } = await fetchFilteredBooksAction({
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
    take: 20
  });

  return (
    <LibraryClient 
      initialBooks={books} 
      initialTotalCount={totalCount} 
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
