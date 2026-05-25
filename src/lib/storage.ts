import { storage } from '@/lib/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Extract storage path from a full public/signed URL or return as-is if already a path.
 * With Firebase, we typically just store the path and use getDownloadURL.
 */
export function extractStoragePath(urlOrPath: string): string {
  if (!urlOrPath) return urlOrPath;
  // Firebase download URLs are complex. It's recommended to just use paths directly.
  return urlOrPath;
}

/**
 * Get a signed URL for a storage file. Falls back to the original URL on error.
 */
export async function getSignedUrl(urlOrPath: string): Promise<string> {
  if (!urlOrPath) return urlOrPath;
  if (!storage) return urlOrPath;
  
  // If it's already a full HTTP URL, return as is
  if (urlOrPath.startsWith('http')) return urlOrPath;
  
  try {
    const storageRef = ref(storage, urlOrPath);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error: any) {
    console.warn('Failed to create download URL, falling back to original:', error?.message);
    return urlOrPath;
  }
}

/**
 * Get signed URLs for multiple files at once.
 */
export async function getSignedUrls(urlsOrPaths: string[]): Promise<string[]> {
  if (!urlsOrPaths || urlsOrPaths.length === 0) return [];
  return Promise.all(urlsOrPaths.map(getSignedUrl));
}

/**
 * Upload a file and return the storage path (not public URL).
 */
export async function uploadToStorage(
  file: Blob,
  filePath: string,
  contentType = 'image/jpeg'
): Promise<string> {
  if (!storage) throw new Error("Firebase storage is not configured");
  const storageRef = ref(storage, filePath);
  await uploadBytes(storageRef, file, { contentType });
  // Firebase allows returning the path and later fetching it using getDownloadURL
  return filePath;
}
