import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Check, AlertCircle, MapPin, RefreshCw, Clock, Smartphone, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

interface LiveCameraCaptureProps {
  onCapture: (imageData: string, metadata: ImageMetadata) => void;
  onCancel: () => void;
  inline?: boolean;
}

interface ImageMetadata {
  timestamp: Date;
  location?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  deviceInfo?: string;
  notes?: string;
}

export function LiveCameraCapture({ onCapture, onCancel, inline = false }: LiveCameraCaptureProps) {
  const { t, language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<{data: string, id: number}[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [notes, setNotes] = useState('');
  const [time, setTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'Android Device';
    if (/iPad|iPhone|iPod/.test(ua)) return 'iOS Device';
    return 'Web Browser';
  };

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setCameraReady(false);

      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { ideal: 'environment' }, 
            width: { ideal: 1280 }, 
            height: { ideal: 720 } 
          },
          audio: false,
        });
      } catch (fallbackErr) {
        console.warn('Fallback camera request...', fallbackErr);
        // Fallback for strict browsers or webcams without environment capability
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setCameraReady(true);
            setIsLoading(false);
          }).catch((err) => {
            console.error('Video play error:', err);
            setError('Failed to start camera preview');
            setIsLoading(false);
          });
        };
      }

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => setLocation(position.coords),
          (err) => {
            console.warn('Location error:', err);
            // Don't crash the camera if location fails, but we could show a warning toast.
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera blocked. Please click the camera icon (📷) in your browser address bar to allow access, then Try Again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError(err.message || 'Failed to access camera');
      }
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    if (imageData && imageData !== 'data:,') {
      const newImage = { data: imageData, id: Date.now() };
      setCapturedImages(prev => [...prev, newImage]);
      setSelectedImageIndex(capturedImages.length);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...capturedImages];
    newImages.splice(index, 1);
    setCapturedImages(newImages);
    if (selectedImageIndex >= newImages.length) {
      setSelectedImageIndex(newImages.length - 1);
    }
  };

  const confirmCapture = () => {
    if (capturedImages.length > 0) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const metadata: ImageMetadata = {
        timestamp: time,
        location: location ? {
          lat: location.latitude,
          lng: location.longitude,
          accuracy: location.accuracy,
        } : undefined,
        deviceInfo: getDeviceInfo(),
        notes: notes
      };
      
      // Submit the first image for now since the existing signature only accepts one
      // The backend can be updated later to handle multiple if needed
      onCapture(capturedImages[0].data, metadata);
    }
  };

  const handleCancel = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onCancel();
  };

  const MetadataPanel = () => (
    <div className="absolute right-4 top-4 w-64 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white z-20 flex flex-col gap-3 shadow-2xl">
      <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Metadata</h3>
      
      <div className="flex items-center gap-3 text-sm">
        <MapPin className="w-4 h-4 text-green-400" />
        <span className="truncate flex-1">
          {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Acquiring GPS...'}
        </span>
      </div>
      
      <div className="flex items-center gap-3 text-sm">
        <Clock className="w-4 h-4 text-blue-400" />
        <span>{time.toLocaleTimeString()}</span>
      </div>
      
      <div className="flex items-center gap-3 text-sm">
        <Smartphone className="w-4 h-4 text-purple-400" />
        <span>{getDeviceInfo()}</span>
      </div>

      <div className="mt-2 pt-3 border-t border-white/10">
        <Textarea 
          placeholder="Add optional notes..." 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40 resize-none h-20 text-xs focus-visible:ring-accent"
        />
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="space-y-4">
        {/* Main Camera Viewport */}
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] shadow-inner group">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Initializing Camera...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted p-4">
              <AlertCircle className="w-10 h-10 text-destructive mb-3" />
              <p className="text-sm text-center text-muted-foreground mb-3">{error}</p>
              <Button onClick={startCamera} size="sm" variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" /> Try Again
              </Button>
            </div>
          )}

          {!error && (
            <>
              {/* Either show live preview or the currently selected captured image */}
              {selectedImageIndex === -1 ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn("w-full h-full object-cover", (!cameraReady || isLoading) ? "hidden" : "block")}
                  />
                  
                  {/* Square Reticle Overlay */}
                  {!isLoading && cameraReady && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-[70%] h-[70%] border border-white/30 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] relative">
                        {/* Corner Accents */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-accent rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-accent rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-accent rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-accent rounded-br-lg" />
                      </div>
                    </div>
                  )}
                  
                  {/* Metadata Panel overlay for inline mode (hidden on small screens) */}
                  <div className="hidden sm:block">
                    <MetadataPanel />
                  </div>
                  
                  {/* Mobile simplified metadata */}
                  <div className="absolute top-2 left-2 sm:hidden flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-md px-2 py-1 border border-white/10">
                    <MapPin className={cn("w-3 h-3", location ? "text-green-400" : "text-gray-400 animate-pulse")} />
                    <span className="text-[10px] text-white">GPS {location ? 'Ready' : 'Wait'}</span>
                  </div>
                </>
              ) : (
                <div className="relative w-full h-full">
                  <img 
                    src={capturedImages[selectedImageIndex].data} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-4 left-4 z-20 rounded-full"
                    onClick={() => removeImage(selectedImageIndex)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Filmstrip & Controls */}
        <div className="flex flex-col gap-4">
          
          {/* Filmstrip */}
          {capturedImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 px-1 items-center">
              {capturedImages.map((img, idx) => (
                <div 
                  key={img.id}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={cn(
                    "w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border-2 transition-all",
                    selectedImageIndex === idx ? "border-accent scale-105 shadow-lg" : "border-transparent opacity-70 hover:opacity-100"
                  )}
                >
                  <img src={img.data} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                </div>
              ))}
              
              {/* Add more button */}
              {capturedImages.length < 3 && (
                <button 
                  onClick={() => setSelectedImageIndex(-1)}
                  className={cn(
                    "w-16 h-16 rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/50 text-muted-foreground hover:bg-accent/10 hover:text-accent hover:border-accent transition-all",
                    selectedImageIndex === -1 ? "border-accent text-accent bg-accent/5" : ""
                  )}
                >
                  <Plus className="w-6 h-6" />
                </button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            
            {selectedImageIndex === -1 ? (
              <Button
                onClick={capturePhoto}
                disabled={isLoading || !!error || !cameraReady}
                className="flex-[2] btn-saffron"
              >
                <Camera className="w-4 h-4 mr-2" />
                Capture
              </Button>
            ) : (
              <Button
                onClick={confirmCapture}
                className="flex-[2] btn-saffron"
              >
                <Check className="w-4 h-4 mr-2" />
                Use {capturedImages.length > 1 ? `${capturedImages.length} Photos` : 'Photo'}
              </Button>
            )}
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5 mt-2">
          <AlertCircle className="w-3.5 h-3.5" />
          Live camera only - Gallery uploads disabled for verified authenticity
        </p>
      </div>
    );
  }

  // Full-screen view
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
    >
      <div className="flex items-center justify-between p-4 bg-black/80 z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="text-white hover:bg-white/10"
        >
          <X className="w-6 h-6" />
        </Button>
        <span className="text-white font-medium text-lg tracking-wide">
          Secure Camera
        </span>
        <div className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-full", location ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/50 animate-pulse")}>
          <MapPin className="w-3 h-3" />
          <span>{location ? "GPS Locked" : "Locating"}</span>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
        {isLoading && (
          <RefreshCw className="w-8 h-8 text-white animate-spin" />
        )}

        {error && (
          <div className="text-center p-6">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-white mb-4">{error}</p>
            <Button onClick={startCamera} variant="outline" className="text-white border-white">Try Again</Button>
          </div>
        )}

        {!error && (
          <>
            {selectedImageIndex === -1 ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn("absolute inset-0 w-full h-full object-cover", (!cameraReady || isLoading) ? "hidden" : "block")}
              />
            ) : (
              <img
                src={capturedImages[selectedImageIndex].data}
                alt="Captured Preview"
                className="absolute inset-0 w-full h-full object-contain"
              />
            )}

            {/* Square Reticle & Side Panel for Camera mode */}
            {selectedImageIndex === -1 && !isLoading && cameraReady && (
              <>
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[85vw] md:w-[60vh] aspect-square border border-white/20 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-accent rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-accent rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-accent rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-accent rounded-br-xl" />
                  </div>
                </div>
                
                <div className="hidden lg:block">
                  <MetadataPanel />
                </div>
              </>
            )}
            
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
      </div>

      {/* Footer Controls */}
      <div className="bg-black/90 pb-safe pt-4 px-6 z-20 border-t border-white/10">
        
        {/* Filmstrip */}
        {capturedImages.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-4 items-center justify-center mb-2">
            {capturedImages.map((img, idx) => (
              <div 
                key={img.id}
                onClick={() => setSelectedImageIndex(idx)}
                className={cn(
                  "w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer border-2 transition-all relative",
                  selectedImageIndex === idx ? "border-accent scale-110 z-10" : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <img src={img.data} className="w-full h-full object-cover" alt="Thumb" />
                {selectedImageIndex === idx && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                    className="absolute top-1 right-1 bg-red-500 rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            ))}
            
            {capturedImages.length < 3 && (
              <button 
                onClick={() => setSelectedImageIndex(-1)}
                className={cn(
                  "w-16 h-16 rounded-xl flex items-center justify-center border-2 border-dashed border-white/30 text-white/50 hover:bg-white/10 transition-all",
                  selectedImageIndex === -1 ? "border-accent text-accent bg-accent/10" : ""
                )}
              >
                <Plus className="w-6 h-6" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between max-w-md mx-auto mb-6">
          <div className="w-20">
            {/* Empty space to balance flex layout */}
          </div>
          
          {selectedImageIndex === -1 ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={capturePhoto}
              disabled={isLoading || !!error || !cameraReady}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center disabled:opacity-50 relative group"
            >
              <div className="w-16 h-16 rounded-full border-4 border-black/20 group-hover:border-black/10 transition-colors" />
              <div className="absolute -inset-2 rounded-full border border-white/20" />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={confirmCapture}
              className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-white shadow-[0_0_30px_rgba(34,197,94,0.4)]"
            >
              <Check className="w-8 h-8" />
            </motion.button>
          )}
          
          <div className="w-20 flex justify-end">
             {capturedImages.length > 0 && selectedImageIndex === -1 && (
               <Button onClick={confirmCapture} variant="ghost" className="text-white hover:bg-white/10 hover:text-white font-semibold">
                 Done ({capturedImages.length})
               </Button>
             )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
