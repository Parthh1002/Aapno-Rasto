import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, MapPin, AlertTriangle, CheckCircle2, Loader2, X, RotateCcw } from 'lucide-react';
import { Complaint, calculateDistance } from '@/hooks/useComplaints';

interface ResolutionCaptureProps {
  complaint: Complaint;
  onSubmit: (data: {
    resolution_image: string;
    resolution_notes: string;
    resolution_lat: number;
    resolution_lng: number;
    location_mismatch: boolean;
  }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
}

const LOCATION_MISMATCH_THRESHOLD = 500; // meters

export function ResolutionCapture({ complaint, onSubmit, onCancel, isSubmitting }: ResolutionCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera stream
  useEffect(() => {
    startCamera();
    getLocation();
    
    return () => {
      stopCamera();
    };
  }, []);

  // Calculate distance when location is obtained
  useEffect(() => {
    if (location && complaint.lat && complaint.lng) {
      const dist = calculateDistance(
        complaint.lat,
        complaint.lng,
        location.lat,
        location.lng
      );
      setDistance(dist);
    }
  }, [location, complaint.lat, complaint.lng]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      setCameraError('Unable to access camera. Please grant camera permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLocationError(null);
      },
      (error) => {
        console.error('Location error:', error);
        setLocationError('Unable to get your location. Please enable location services.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleSubmit = () => {
    if (!capturedImage || !location) return;

    const locationMismatch = distance !== null && distance > LOCATION_MISMATCH_THRESHOLD;

    onSubmit({
      resolution_image: capturedImage,
      resolution_notes: notes,
      resolution_lat: location.lat,
      resolution_lng: location.lng,
      location_mismatch: locationMismatch,
    });
  };

  const isLocationMismatch = distance !== null && distance > LOCATION_MISMATCH_THRESHOLD;
  const canSubmit = capturedImage && location && notes.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Complaint Summary */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resolving: {complaint.category}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">{complaint.description}</p>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Original location: {complaint.lat.toFixed(6)}, {complaint.lng.toFixed(6)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Camera / Captured Image */}
      <div className="space-y-2">
        <Label>Resolution Photo (Live Capture Only)</Label>
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isStreaming && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>{cameraError}</AlertDescription>
                  </Alert>
                </div>
              )}
            </>
          ) : (
            <img src={capturedImage} alt="Captured resolution" className="w-full h-full object-cover" />
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="flex gap-2">
          {!capturedImage ? (
            <Button onClick={capturePhoto} disabled={!isStreaming} className="flex-1">
              <Camera className="w-4 h-4 mr-2" />
              Capture Photo
            </Button>
          ) : (
            <Button variant="outline" onClick={retakePhoto} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake Photo
            </Button>
          )}
        </div>
      </div>

      {/* GPS Status */}
      <div className="space-y-2">
        <Label>GPS Verification</Label>
        {locationError ? (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="flex items-center justify-between">
              {locationError}
              <Button variant="outline" size="sm" onClick={getLocation}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : location ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <MapPin className="w-4 h-4 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Your Location</p>
                <p className="text-xs text-muted-foreground">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)} (±{location.accuracy.toFixed(0)}m)
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            
            {distance !== null && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                isLocationMismatch ? 'bg-red-500/10' : 'bg-green-500/10'
              }`}>
                {isLocationMismatch ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-600">Location Mismatch Warning</p>
                      <p className="text-xs text-red-600/80">
                        You are {(distance / 1000).toFixed(2)}km from the complaint location (threshold: {LOCATION_MISMATCH_THRESHOLD}m)
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                      HIGH RISK
                    </Badge>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-600">Location Verified</p>
                      <p className="text-xs text-green-600/80">
                        Distance from complaint: {distance.toFixed(0)}m
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Getting your location...</span>
          </div>
        )}
      </div>

      {/* Resolution Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Resolution Notes *</Label>
        <Textarea
          id="notes"
          placeholder="Describe how the issue was resolved..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting} className="flex-1">
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!canSubmit || isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Submit Resolution
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
