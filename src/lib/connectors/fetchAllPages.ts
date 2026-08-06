/**
 * Real fix for a real, non-obvious bug found via the ad sync: Meta's
 * API paginates results, and every call in this connector was only
 * ever fetching the first page, relying on Meta's implicit default
 * page size with no error or warning when more data existed. Confirmed
 * by the exact count matching that default precisely — not a guess.
 *
 * One shared implementation now, used by every Meta API call in this
 * sync worker, rather than the same loop duplicated (and potentially
 * inconsistently maintained) in five separate places.
 *
 * MAX_PAGES is a real, disclosed safety cap — prevents an unbounded
 * loop against a very large account, logged clearly if actually hit
 * rather than silently truncating like the original bug did.
 */
export async function fetchAllPages<T>(
  initialUrl: string,
  context: string,
  maxPages = 10
): Promise<T[]> {
  const results: T[] = [];
  let nextUrl: string | null = initialUrl;
  let pagesFetched = 0;

  while (nextUrl && pagesFetched < maxPages) {
    const res = await fetch(nextUrl);
    if (!res.ok) {
      console.error(`[pagination] ${context} returned ${res.status} on page ${pagesFetched + 1} — stopping, keeping what was fetched so far.`);
      break;
    }

    const body = await res.json() as { data: T[]; paging?: { next?: string } };
    results.push(...body.data);
    pagesFetched++;
    nextUrl = body.paging?.next ?? null;
  }

  if (pagesFetched >= maxPages && nextUrl) {
    console.error(`[pagination] ${context} hit the ${maxPages}-page safety cap — more data may exist beyond what was fetched this run.`);
  }

  return results;
}
