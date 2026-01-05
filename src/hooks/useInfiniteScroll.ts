import { useState, useCallback, useRef, useEffect } from "react";

interface UseInfiniteScrollOptions<T> {
  fetchFn: (page: number) => Promise<{ data: T[]; hasMore: boolean }>;
  pageSize?: number;
}

export function useInfiniteScroll<T>({ fetchFn, pageSize = 20 }: UseInfiniteScrollOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [shouldFetch, setShouldFetch] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);

  const reset = useCallback(() => {
    setItems([]);
    setPage(0);
    setHasMore(true);
    setLoading(true);
    setShouldFetch(true);
    isFetchingRef.current = false;
  }, []);

  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMore) return;

    isFetchingRef.current = true;
    setLoadingMore(true);
    try {
      const result = await fetchFn(page);
      setItems(prev => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error("Error loading more:", error);
    } finally {
      setLoadingMore(false);
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [fetchFn, page, hasMore]);

  // Initial fetch
  useEffect(() => {
    if (shouldFetch && loading && !isFetchingRef.current) {
      setShouldFetch(false);
      loadMore();
    }
  }, [shouldFetch, loading, loadMore]);

  const setLoadMoreElement = useCallback((element: HTMLDivElement | null) => {
    loadMoreRef.current = element;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (element) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !isFetchingRef.current && !loading) {
            loadMore();
          }
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(element);
    }
  }, [hasMore, loading, loadMore]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    items,
    setItems,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    reset,
    setLoadMoreElement,
  };
}
