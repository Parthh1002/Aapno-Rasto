/**
 * GPS + Timestamp Watermark Utility for Engineer Proof Images
 * Applies a visible watermark overlay with location and time data
 */

export interface WatermarkOptions {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: Date;
  complaintId?: string;
  engineerLocation?: { lat: number; lng: number };
  complaintLocation?: { lat: number; lng: number };
}

export interface WatermarkResult {
  watermarkedDataUrl: string;
  metadata: {
    lat: number;
    lng: number;
    accuracy?: number;
    timestamp: string;
    distanceFromComplaint?: number;
    isLocationValid: boolean;
  };
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format coordinates to a readable string
 */
function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`;
}

/**
 * Format date and time for watermark display
 */
function formatDateTime(date: Date): string {
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
}

/**
 * Apply GPS and timestamp watermark to an image
 * Uses Canvas API for client-side processing
 */
export async function applyWatermark(
  imageDataUrl: string,
  options: WatermarkOptions
): Promise<WatermarkResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Create canvas with image dimensions
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Calculate watermark dimensions
        const padding = 15;
        const lineHeight = 22;
        const fontSize = Math.max(14, Math.min(18, img.width / 50));
        
        // Prepare watermark text lines
        const lines: string[] = [];
        
        // GPS coordinates
        const coordsText = `📍 ${formatCoordinates(options.lat, options.lng)}`;
        lines.push(coordsText);
        
        // Accuracy if available
        if (options.accuracy) {
          lines.push(`Accuracy: ±${Math.round(options.accuracy)}m`);
        }
        
        // Timestamp
        const timeText = `🕐 ${formatDateTime(options.timestamp)}`;
        lines.push(timeText);
        
        // Complaint ID if provided
        if (options.complaintId) {
          lines.push(`ID: #${options.complaintId.slice(0, 8).toUpperCase()}`);
        }

        // Distance from complaint location
        let distanceFromComplaint: number | undefined;
        let isLocationValid = true;
        
        if (options.complaintLocation) {
          distanceFromComplaint = calculateDistance(
            options.lat,
            options.lng,
            options.complaintLocation.lat,
            options.complaintLocation.lng
          );
          isLocationValid = distanceFromComplaint <= 500; // 500m threshold
          
          const distanceText = `Distance: ${Math.round(distanceFromComplaint)}m from site`;
          lines.push(distanceText);
          
          if (!isLocationValid) {
            lines.push('⚠️ LOCATION MISMATCH');
          } else {
            lines.push('✓ Location Verified');
          }
        }

        // Calculate watermark box dimensions
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        const maxTextWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
        const boxWidth = maxTextWidth + padding * 2;
        const boxHeight = lines.length * lineHeight + padding * 2;
        
        // Position at bottom of image
        const boxX = padding;
        const boxY = img.height - boxHeight - padding;

        // Draw semi-transparent background with border
        ctx.fillStyle = isLocationValid 
          ? 'rgba(0, 0, 0, 0.75)' 
          : 'rgba(180, 50, 50, 0.85)'; // Red tint for location mismatch
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
        ctx.fill();

        // Add border
        ctx.strokeStyle = isLocationValid 
          ? 'rgba(255, 255, 255, 0.5)'
          : 'rgba(255, 100, 100, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw watermark text
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'top';
        
        lines.forEach((line, index) => {
          const textY = boxY + padding + (index * lineHeight);
          
          // Highlight warning lines
          if (line.includes('MISMATCH')) {
            ctx.fillStyle = '#ff6b6b';
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
          } else if (line.includes('Verified')) {
            ctx.fillStyle = '#4ade80';
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
          } else {
            ctx.fillStyle = '#ffffff';
            ctx.font = `${fontSize}px Arial, sans-serif`;
          }
          
          ctx.fillText(line, boxX + padding, textY);
        });

        // Add "GOVT VERIFIED" stamp in corner for valid locations
        if (isLocationValid && options.complaintLocation) {
          const stampText = 'GOVT VERIFIED';
          ctx.font = `bold ${fontSize + 2}px Arial, sans-serif`;
          const stampWidth = ctx.measureText(stampText).width + 20;
          const stampHeight = 30;
          const stampX = img.width - stampWidth - padding;
          const stampY = padding;
          
          ctx.fillStyle = 'rgba(34, 139, 34, 0.85)';
          ctx.roundRect(stampX, stampY, stampWidth, stampHeight, 6);
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.textBaseline = 'middle';
          ctx.fillText(stampText, stampX + 10, stampY + stampHeight / 2);
        }

        // Convert to data URL
        const watermarkedDataUrl = canvas.toDataURL('image/jpeg', 0.9);

        resolve({
          watermarkedDataUrl,
          metadata: {
            lat: options.lat,
            lng: options.lng,
            accuracy: options.accuracy,
            timestamp: options.timestamp.toISOString(),
            distanceFromComplaint,
            isLocationValid,
          },
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for watermarking'));
    };

    img.src = imageDataUrl;
  });
}

/**
 * Convert data URL to Blob for upload
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
}
