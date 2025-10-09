import { useEffect, useRef, useState, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
  root?: HTMLElement | null;
}

/**
 * Custom hook for implementing infinite scrolling using Intersection Observer API
 * @param callback Function to call when the target element is visible
 * @param options Configuration options for the Intersection Observer
 * @returns Object containing ref to attach to the sentinel element and loading state
 */
const useInfiniteScroll = (
  callback: () => void,
  {
    threshold = 0,
    rootMargin = '0px',
    enabled = true,
    root = null
  }: UseInfiniteScrollOptions = {}
) => {
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(callback);

  // Keep the callback reference updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && enabled && !isLoading) {
        setIsLoading(true);

        // Use the most recent callback from the ref
        Promise.resolve(callbackRef.current())
          .catch((error) => {
            console.error('Error in infinite scroll callback:', error);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    },
    [enabled, isLoading]
  );

  useEffect(() => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (!enabled) return;

    // Create new observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root, // This can be the scrollable container
      rootMargin,
      threshold
    });

    // Observe target element if it exists
    const currentTarget = targetRef.current;
    if (currentTarget) {
      observerRef.current.observe(currentTarget);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection, rootMargin, threshold, enabled, root]);

  return {
    targetRef,
    isLoading
  };
};

export default useInfiniteScroll;
