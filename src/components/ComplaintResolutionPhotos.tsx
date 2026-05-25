import React, { useState } from 'react';
import { Image as ImageIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useSignedUrls } from '@/hooks/useSignedUrl';

interface ComplaintResolutionPhotosProps {
  photos: string[];
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
  pointsAwarded?: number;
  className?: string;
}

export function ComplaintResolutionPhotos({
  photos,
  resolvedAt,
  resolutionNotes,
  pointsAwarded,
  className,
}: ComplaintResolutionPhotosProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const signedPhotos = useSignedUrls(photos);

  if (!photos || photos.length === 0 || signedPhotos.length === 0) {
    return null;
  }

  const handlePrevious = () => {
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex(
        selectedPhotoIndex === 0 ? photos.length - 1 : selectedPhotoIndex - 1
      );
    }
  };

  const handleNext = () => {
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex(
        selectedPhotoIndex === photos.length - 1 ? 0 : selectedPhotoIndex + 1
      );
    }
  };

  return (
    <>
      <Card className={cn('govt-card', className)}>
        <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-accent" />
              Resolution Proof Photos
            </CardTitle>
            {pointsAwarded && (
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent">
                +{pointsAwarded} points
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Photo Grid */}
          <div className={cn(
            'grid gap-2',
            photos.length === 1 ? 'grid-cols-1' : 
            photos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
          )}>
            {signedPhotos.map((photo, index) => (
              <div
                key={index}
                className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-border hover:border-accent transition-colors"
                onClick={() => setSelectedPhotoIndex(index)}
              >
                <img
                  src={photo}
                  alt={`Resolution proof ${index + 1}`}
                  className="w-full h-24 object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    View
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Resolution Notes */}
          {resolutionNotes && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Resolution Notes</p>
              <p className="text-sm">{resolutionNotes}</p>
            </div>
          )}

          {/* Resolved Date */}
          {resolvedAt && (
            <p className="text-xs text-muted-foreground">
              Resolved on {new Date(resolvedAt).toLocaleDateString()} at{' '}
              {new Date(resolvedAt).toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lightbox Dialog */}
      <Dialog open={selectedPhotoIndex !== null} onOpenChange={() => setSelectedPhotoIndex(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              onClick={() => setSelectedPhotoIndex(null)}
            >
              <X className="w-5 h-5" />
            </Button>

            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={handleNext}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}

            {/* Image */}
            {selectedPhotoIndex !== null && (
              <img
                src={signedPhotos[selectedPhotoIndex]}
                alt={`Resolution proof ${selectedPhotoIndex + 1}`}
                className="w-full max-h-[80vh] object-contain"
              />
            )}

            {/* Photo Counter */}
            {photos.length > 1 && selectedPhotoIndex !== null && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {selectedPhotoIndex + 1} / {photos.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
