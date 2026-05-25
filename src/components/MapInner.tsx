import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Complaint } from './ComplaintCard';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const GUJARAT_BOUNDS: L.LatLngBoundsExpression = [
  [20.0, 68.0],
  [24.7, 74.5],
];

const GUJARAT_CENTER: L.LatLngTuple = [22.3, 71.8];

const createMarkerIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

const getMarkerIcon = (status: string) => {
  switch (status) {
    case 'pending': return createMarkerIcon('#FF9933');
    case 'in_progress': return createMarkerIcon('#FFC107');
    case 'completed': return createMarkerIcon('#2E7D32');
    default: return createMarkerIcon('#FF9933');
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return '#FF9933';
    case 'in_progress': return '#FFC107';
    case 'completed': return '#2E7D32';
    default: return '#FF9933';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return 'Pending';
    case 'in_progress': return 'In Progress';
    case 'completed': return 'Completed';
    default: return status;
  }
};

// Dynamic radius based on zoom level: zoom 18 → 1m, zoom 7 → 50m
const getHeatmapRadius = (zoom: number): number => {
  const minZoom = 7;
  const maxZoom = 18;
  const minRadius = 1;
  const maxRadius = 50;
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
  const t = (clampedZoom - minZoom) / (maxZoom - minZoom);
  // Exponential interpolation for smoother feel
  return maxRadius * Math.pow(minRadius / maxRadius, t);
};

// Get heatmap circle visual radius (in pixels for display)
const getCirclePixelRadius = (zoom: number): number => {
  const minZoom = 7;
  const maxZoom = 18;
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
  const t = (clampedZoom - minZoom) / (maxZoom - minZoom);
  // From 3000m at zoom 7 to 30m at zoom 18
  return 3000 * Math.pow(30 / 3000, t);
};

interface MapInnerProps {
  complaints: Complaint[];
  onMarkerClick?: (complaint: Complaint) => void;
  showHeatmap?: boolean;
  height?: string;
}

function MapInner({ 
  complaints, 
  onMarkerClick, 
  showHeatmap = false,
  height = '400px'
}: MapInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);
  const complaintsRef = useRef<Complaint[]>(complaints);

  complaintsRef.current = complaints;

  // Haversine distance
  const getDistanceInMeters = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Build heatmap popup HTML
  const buildHeatmapPopup = useCallback((lat: number, lng: number, radius: number) => {
    const nearby = complaintsRef.current.filter(c => {
      const dist = getDistanceInMeters(lat, lng, c.location.lat, c.location.lng);
      return dist <= radius;
    });

    const total = nearby.length;
    const pendingCount = nearby.filter(c => c.status === 'pending').length;
    const progressCount = nearby.filter(c => c.status === 'in_progress').length;
    const highUrgency = nearby.filter(c => c.urgency === 'high').length;

    const catMap = new Map<string, number>();
    nearby.forEach(c => catMap.set(c.category, (catMap.get(c.category) || 0) + 1));

    const catIcons: Record<string, string> = {
      garbage: '🗑️', streetLight: '💡', roadMaintenance: '🛣️',
      waterSupply: '💧', drainage: '🚿', publicSafety: '🛡️', strayDog: '🐕',
    };

    const catBreakdown = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `
        <div style="display:flex;align-items:center;gap:4px;font-size:11px;">
          <span>${catIcons[cat] || '📋'}</span>
          <span style="flex:1">${cat}</span>
          <strong>${count}</strong>
        </div>
      `).join('');

    return `
      <div style="
        min-width:220px;
        font-family:'Poppins',sans-serif;
        animation: popupPulse 0.3s ease-out;
      ">
        <style>
          @keyframes popupPulse {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        </style>
        <div style="
          background:linear-gradient(135deg,#002147,#003366);
          color:white;
          padding:10px 12px;
          border-radius:8px 8px 0 0;
          margin:-1px -1px 0 -1px;
        ">
          <strong style="font-size:14px;">📍 Area Statistics</strong>
        </div>
        <div style="padding:10px 12px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
            <div style="text-align:center;padding:6px;background:#f8f8f8;border-radius:6px;">
              <div style="font-size:18px;font-weight:700;color:#002147;">${total}</div>
              <div style="font-size:10px;color:#666;">Total</div>
            </div>
            <div style="text-align:center;padding:6px;background:#fff3e0;border-radius:6px;">
              <div style="font-size:18px;font-weight:700;color:#FF9933;">${pendingCount}</div>
              <div style="font-size:10px;color:#666;">Pending</div>
            </div>
            <div style="text-align:center;padding:6px;background:#fff8e1;border-radius:6px;">
              <div style="font-size:18px;font-weight:700;color:#F57F17;">${progressCount}</div>
              <div style="font-size:10px;color:#666;">In Progress</div>
            </div>
            <div style="text-align:center;padding:6px;background:#fce4ec;border-radius:6px;">
              <div style="font-size:18px;font-weight:700;color:#DC2626;">${highUrgency}</div>
              <div style="font-size:10px;color:#666;">High Urgency</div>
            </div>
          </div>
          ${catBreakdown ? `
            <div style="border-top:1px solid #eee;padding-top:6px;">
              <div style="font-size:11px;font-weight:600;margin-bottom:4px;color:#333;">By Category:</div>
              ${catBreakdown}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }, [getDistanceInMeters]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return;

    const map = L.map(containerRef.current, {
      center: GUJARAT_CENTER,
      zoom: 7,
      minZoom: 6,
      maxZoom: 18,
      maxBounds: GUJARAT_BOUNDS,
      maxBoundsViscosity: 1.0,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on('drag', () => {
      map.panInsideBounds(GUJARAT_BOUNDS, { animate: false });
    });

    markersLayerRef.current = L.layerGroup().addTo(map);
    heatmapLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      heatmapLayerRef.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    complaints.forEach((complaint) => {
      const marker = L.marker(
        [complaint.location.lat, complaint.location.lng],
        { icon: getMarkerIcon(complaint.status) }
      );

      const popupContent = `
        <div style="padding:8px;min-width:200px;font-family:'Poppins',sans-serif;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:12px;height:12px;border-radius:50%;background-color:${getStatusColor(complaint.status)};"></div>
            <span style="font-weight:600;">${complaint.category}</span>
          </div>
          <p style="font-size:14px;color:#666;margin-bottom:8px;">${complaint.description}</p>
          <p style="font-size:12px;color:#888;">${complaint.location.address}</p>
          <div style="
            margin-top:8px;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:500;
            display:inline-block;
            background-color:${complaint.status === 'pending' ? '#FFF3E0' : complaint.status === 'in_progress' ? '#FFF8E1' : '#E8F5E9'};
            color:${complaint.status === 'pending' ? '#E65100' : complaint.status === 'in_progress' ? '#F57F17' : '#2E7D32'};
          ">
            ${getStatusLabel(complaint.status)}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 280, className: 'animated-popup' });
      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(complaint));
      }
      marker.addTo(markersLayer);
    });
  }, [complaints, onMarkerClick]);

  // Update heatmap with dynamic radius
  useEffect(() => {
    const map = mapInstanceRef.current;
    const heatmapLayer = heatmapLayerRef.current;
    if (!map || !heatmapLayer) return;

    const updateHeatmap = () => {
      heatmapLayer.clearLayers();
      if (!showHeatmap) return;

      const zoom = map.getZoom();
      const circleRadius = getCirclePixelRadius(zoom);
      const clusterRadius = getHeatmapRadius(zoom);

      const activeComplaints = complaints.filter(c => c.status !== 'completed');

      // Filter overlapping points
      const uniqueLocations: typeof activeComplaints = [];
      activeComplaints.forEach((complaint) => {
        const isTooClose = uniqueLocations.some(existing => {
          const distance = getDistanceInMeters(
            existing.location.lat, existing.location.lng,
            complaint.location.lat, complaint.location.lng
          );
          return distance < clusterRadius;
        });
        if (!isTooClose) {
          uniqueLocations.push(complaint);
        }
      });

      // Count complaints near each unique location
      uniqueLocations.forEach((loc) => {
        const nearbyCount = activeComplaints.filter(c => {
          const dist = getDistanceInMeters(loc.location.lat, loc.location.lng, c.location.lat, c.location.lng);
          return dist <= circleRadius * 2;
        }).length;

        // Intensity based on count
        const intensity = Math.min(0.7, 0.1 + nearbyCount * 0.12);

        // Gradient color: green → yellow → red based on intensity
        let fillColor: string;
        if (intensity < 0.25) fillColor = '#10B981';
        else if (intensity < 0.5) fillColor = '#FBBF24';
        else fillColor = '#DC2626';

        const circle = L.circle([loc.location.lat, loc.location.lng], {
          radius: circleRadius,
          color: 'transparent',
          fillColor,
          fillOpacity: intensity,
          className: 'heatmap-circle',
        });

        // Animated popup on click
        circle.bindPopup(
          () => buildHeatmapPopup(loc.location.lat, loc.location.lng, circleRadius * 2),
          {
            maxWidth: 300,
            className: 'heatmap-popup',
            autoPan: true,
            autoPanPadding: L.point(40, 40),
          }
        );

        circle.addTo(heatmapLayer);
      });
    };

    updateHeatmap();
    map.on('zoomend', updateHeatmap);

    return () => {
      map.off('zoomend', updateHeatmap);
    };
  }, [complaints, showHeatmap, buildHeatmapPopup, getDistanceInMeters]);

  return (
    <div 
      ref={containerRef} 
      style={{ height, width: '100%' }}
    />
  );
}

export default MapInner;
