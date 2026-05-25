import React from 'react';
import { useSignedUrl } from '@/hooks/useSignedUrl';

interface SignedImageProps {
  url: string;
  alt: string;
  label?: string;
  className?: string;
  containerClassName?: string;
}

export function SignedImage({ url, alt, label, className = 'w-full rounded-lg', containerClassName }: SignedImageProps) {
  const signedUrl = useSignedUrl(url);

  if (!signedUrl) return null;

  return (
    <div className={containerClassName}>
      {label && <p className="text-sm text-muted-foreground mb-2">{label}</p>}
      <img src={signedUrl} alt={alt} className={className} />
    </div>
  );
}
