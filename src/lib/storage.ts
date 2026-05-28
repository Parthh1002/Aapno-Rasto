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
  
  // If it's already a full HTTP URL or data URL, return as is
  if (urlOrPath.startsWith('http') || urlOrPath.startsWith('data:')) return urlOrPath;
  
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
  const getBase64 = () => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  if (!storage) {
    console.warn("Firebase storage is not configured. Falling back to data URL.");
    return getBase64();
  }
  
  try {
    const storageRef = ref(storage, filePath);
    // Add a timeout to prevent hanging if Firebase is misconfigured
    const uploadPromise = uploadBytes(storageRef, file, { contentType });
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Upload timeout")), 8000)
    );
    
    await Promise.race([uploadPromise, timeoutPromise]);
    return filePath;
  } catch (error) {
    console.warn("Upload failed or timed out, falling back to data URL:", error);
    return getBase64();
  }
}
