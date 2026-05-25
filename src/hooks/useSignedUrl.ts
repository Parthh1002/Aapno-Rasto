import { useState, useEffect } from 'react';
import { getSignedUrl, getSignedUrls } from '@/lib/storage';

/**
 * Hook to get a signed URL for a single storage file.
 * Returns the signed URL or null while loading.
 */
export function useSignedUrl(urlOrPath: string | null | undefined): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!urlOrPath) {
      setSignedUrl(null);
      return;
    }

    let cancelled = false;

    getSignedUrl(urlOrPath).then((url) => {
      if (!cancelled) setSignedUrl(url);
    });

    return () => { cancelled = true; };
  }, [urlOrPath]);

  return signedUrl;
}

/**
 * Hook to get signed URLs for multiple storage files.
 */
export function useSignedUrls(urlsOrPaths: string[] | null | undefined): string[] {
  const [signedUrls, setSignedUrls] = useState<string[]>([]);
  const key = urlsOrPaths?.join(',') || '';

  useEffect(() => {
    if (!urlsOrPaths || urlsOrPaths.length === 0) {
      setSignedUrls([]);
      return;
    }

    let cancelled = false;

    getSignedUrls(urlsOrPaths).then((urls) => {
      if (!cancelled) setSignedUrls(urls);
    });

    return () => { cancelled = true; };
  }, [key]);

  return signedUrls;
}
