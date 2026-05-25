import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ResolutionPhotoUploadProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ResolutionPhotoUpload({
  photos,
  onPhotosChange,
  maxPhotos = 3,
  disabled = false,
}: ResolutionPhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only JPG, JPEG, and PNG files are allowed';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB';
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setError(null);

    if (photos.length + files.length > maxPhotos) {
      setError(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    onPhotosChange([...photos, ...validFiles]);
    setPreviews([...previews, ...newPreviews]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    // Revoke old preview URL
    URL.revokeObjectURL(previews[index]);
    
    onPhotosChange(newPhotos);
    setPreviews(newPreviews);
    setError(null);
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Resolution Proof Photos *
        </Label>
        <span className="text-xs text-muted-foreground">
          {photos.length}/{maxPhotos} photos
        </span>
      </div>

      {/* Photo Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {previews.map((preview, index) => (
            <div 
              key={index} 
              className="relative group rounded-lg overflow-hidden border-2 border-border"
            >
              <img 
                src={preview} 
                alt={`Resolution proof ${index + 1}`}
                className="w-full h-24 object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={disabled}
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">
                Photo {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {canAddMore && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            disabled ? "opacity-50 cursor-not-allowed" : "hover:border-accent hover:bg-accent/5",
            error ? "border-destructive" : "border-border"
          )}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Click to upload photos
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, JPEG, PNG (Max 5MB each)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Validation Status */}
      {photos.length >= 1 && (
        <div className="flex items-center gap-2 text-sm text-accent">
          <CheckCircle className="w-4 h-4" />
          {photos.length} photo(s) ready for upload
        </div>
      )}
    </div>
  );
}
