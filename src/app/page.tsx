import LibraryClient from './LibraryClient';
import prisma from '@/lib/prisma';
import { BookWork, BookCopy } from './types';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const allCopies = await prisma.copy.findMany({ include: { work: true } });
  allCopies.sort((a, b) => {
    const numA = parseInt(a.workId.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.workId.replace(/\D/g, '')) || 0;
    return numA - numB;
  });
  const initialCopies = allCopies.slice(0, 20);

  // We actually don't need to pass all `works` anymore since `include: { work: true }` passes the work inside copy!
  // But LibraryClient expects initialWorks and initialCopies.
  // We can pass `initialCopies` mapped with `workId` and extract `initialWorks`.
  const initialWorks = initialCopies.map(c => c.work);
  const totalCount = await prisma.copy.count();

  return <LibraryClient initialWorks={initialWorks as unknown as BookWork[]} initialCopies={initialCopies as unknown as BookCopy[]} initialTotalCount={totalCount} />;
}
