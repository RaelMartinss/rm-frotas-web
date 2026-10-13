import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';

export interface RouteGeometryResult {
  coordinates: [number, number][]; // [lat, lng] array formatted for Leaflet
  distanceMeters: number;
  durationSeconds: number;
  distanceKm: number;
  durationFormatted: string;
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  road?: string;
  city?: string;
  state?: string;
  postcode?: string;
}

@Injectable({
  providedIn: 'root',
})
export class RoutingService {
  private readonly http = inject(HttpClient);

  // OSRM Public Driving Routing API
  private readonly osrmBaseUrl = 'https://router.project-osrm.org/route/v1/driving';

  // Nominatim OpenStreetMap Geocoding API
  private readonly nominatimBaseUrl = 'https://nominatim.openstreetmap.org';

  /**
   * Calculates real road driving route across multiple ordered waypoints.
   * Takes points as array of [lat, lng].
   */
  calculateRoute(points: [number, number][]): Observable<RouteGeometryResult | null> {
    if (!points || points.length < 2) {
      return of(null);
    }

    // OSRM expects coordinates formatted as: lng,lat;lng,lat;...
    const coordsParam = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `${this.osrmBaseUrl}/${coordsParam}?overview=full&geometries=geojson`;

    return this.http.get<any>(url).pipe(
      map((res) => {
        if (!res || res.code !== 'Ok' || !res.routes || res.routes.length === 0) {
          return null;
        }

        const primaryRoute = res.routes[0];
        // OSRM GeoJSON gives [lng, lat] array -> Leaflet needs [lat, lng]
        const leafletCoords: [number, number][] = (primaryRoute.geometry?.coordinates || []).map(
          (c: [number, number]) => [c[1], c[0]]
        );

        const distanceMeters = primaryRoute.distance || 0;
        const durationSeconds = primaryRoute.duration || 0;
        const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;

        return {
          coordinates: leafletCoords,
          distanceMeters,
          durationSeconds,
          distanceKm,
          durationFormatted: this.formatDuration(durationSeconds),
        };
      }),
      catchError((err) => {
        console.warn('[RoutingService] OSRM route fetch failed or network unavailable:', err);
        return of(null);
      })
    );
  }

  /**
   * Reverse geocodes coordinates (lat, lng) to human readable address and city/state via Nominatim.
   */
  reverseGeocode(lat: number, lng: number): Observable<GeocodingResult | null> {
    const url = `${this.nominatimBaseUrl}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

    return this.http.get<any>(url).pipe(
      map((data) => {
        if (!data) return null;
        const addr = data.address || {};
        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          addr.city_district ||
          '';

        let state = addr.state || '';
        // Extract 2-letter state code if present in ISO3166-2-lvl4 (e.g. BR-PA -> PA)
        if (addr['ISO3166-2-lvl4'] && addr['ISO3166-2-lvl4'].startsWith('BR-')) {
          state = addr['ISO3166-2-lvl4'].replace('BR-', '');
        }

        const road = addr.road || addr.highway || addr.pedestrian || '';

        return {
          lat: parseFloat(data.lat),
          lng: parseFloat(data.lon),
          displayName: data.display_name || '',
          road,
          city,
          state,
          postcode: addr.postcode || '',
        };
      }),
      catchError((err) => {
        console.warn('[RoutingService] Reverse geocoding failed:', err);
        return of(null);
      })
    );
  }

  /**
   * Forward searches locations/cities by text query.
   */
  searchLocation(query: string): Observable<GeocodingResult[]> {
    if (!query || query.trim().length < 3) {
      return of([]);
    }

    const encoded = encodeURIComponent(query.trim());
    const url = `${this.nominatimBaseUrl}/search?format=json&q=${encoded}&countrycodes=br&limit=5&addressdetails=1`;

    return this.http.get<any[]>(url).pipe(
      map((items) => {
        if (!Array.isArray(items)) return [];
        return items.map((data) => {
          const addr = data.address || {};
          const city =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.municipality ||
            addr.city_district ||
            '';

          let state = addr.state || '';
          if (addr['ISO3166-2-lvl4'] && addr['ISO3166-2-lvl4'].startsWith('BR-')) {
            state = addr['ISO3166-2-lvl4'].replace('BR-', '');
          }

          return {
            lat: parseFloat(data.lat),
            lng: parseFloat(data.lon),
            displayName: data.display_name || '',
            road: addr.road || '',
            city,
            state,
            postcode: addr.postcode || '',
          };
        });
      }),
      catchError(() => of([]))
    );
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours === 0) {
      return `${minutes} min`;
    }
    return `${hours}h ${minutes.toString().padStart(2, '0')} min`;
  }
}
