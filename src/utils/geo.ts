import type { Coordinates } from '@/types';

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in kilometres. Accurate enough for "how far is it". */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/** A map region that frames every supplied point with a little breathing room. */
export function regionForPoints(points: Coordinates[], paddingRatio = 1.45): Region | null {
  if (points.length === 0) return null;

  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLon = points[0].longitude;
  let maxLon = points[0].longitude;

  for (const p of points) {
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLon = Math.min(minLon, p.longitude);
    maxLon = Math.max(maxLon, p.longitude);
  }

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * paddingRatio, 0.01),
    longitudeDelta: Math.max((maxLon - minLon) * paddingRatio, 0.01),
  };
}

/**
 * Projects a coordinate into 0-1 box space for the fallback map canvas, which
 * runs wherever the native map module is unavailable.
 */
export function projectToBox(point: Coordinates, region: Region): { x: number; y: number } {
  const x = (point.longitude - (region.longitude - region.longitudeDelta / 2)) / region.longitudeDelta;
  const y = ((region.latitude + region.latitudeDelta / 2) - point.latitude) / region.latitudeDelta;
  return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
}

/** Platform-neutral maps deep link for the "Directions" action. */
export function directionsUrl(point: Coordinates, label: string): string {
  const query = encodeURIComponent(`${point.latitude},${point.longitude}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${query}&destination_place_id=&travelmode=driving#${encodeURIComponent(
    label,
  )}`;
}
