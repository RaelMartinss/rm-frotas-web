import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IDriverPortalRepository } from '../../domain/repositories/driver-portal.repository.interface';
import {
  DriverPortalSummary,
  StartTripDTO,
  CompleteTripDTO,
  DriverFuelDTO,
  DriverIncidentDTO,
  DriverHistoryItem,
} from '../../domain/models/driver-portal.model';

const DRIVER_CURRENT_TRIP_KEY = 'rm_driver_current_trip';
const DRIVER_HISTORY_KEY = 'rm_driver_history';

@Injectable({
  providedIn: 'root',
})
export class HttpDriverPortalRepository implements IDriverPortalRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/driver-portal`;

  getCurrentTrip(): Observable<DriverPortalSummary> {
    return this.http.get<DriverPortalSummary>(`${this.baseUrl}/current-trip`, { withCredentials: true }).pipe(
      tap((data) => {
        try {
          localStorage.setItem(DRIVER_CURRENT_TRIP_KEY, JSON.stringify(data));
        } catch {}
      }),
      catchError((error) => {
        // Fallback offline: se houver cache no localStorage, retorna os dados salvos
        try {
          const cached = localStorage.getItem(DRIVER_CURRENT_TRIP_KEY);
          if (cached) {
            return of(JSON.parse(cached) as DriverPortalSummary);
          }
        } catch {}
        throw error;
      })
    );
  }

  startTrip(dto: StartTripDTO): Observable<{ message: string; tripId: string; status: string }> {
    return this.http.post<{ message: string; tripId: string; status: string }>(
      `${this.baseUrl}/start-trip`,
      dto,
      { withCredentials: true }
    );
  }

  completeTrip(dto: CompleteTripDTO): Observable<{ message: string; tripId: string; status: string }> {
    return this.http.post<{ message: string; tripId: string; status: string }>(
      `${this.baseUrl}/complete-trip`,
      dto,
      { withCredentials: true }
    );
  }

  registerFuel(dto: DriverFuelDTO): Observable<{ message: string; id: string; totalCost: number }> {
    return this.http.post<{ message: string; id: string; totalCost: number }>(
      `${this.baseUrl}/fuel-record`,
      dto,
      { withCredentials: true }
    );
  }

  reportIncident(dto: DriverIncidentDTO): Observable<{ message: string; category: string }> {
    return this.http.post<{ message: string; category: string }>(
      `${this.baseUrl}/incident`,
      dto,
      { withCredentials: true }
    );
  }

  sendLocationPings(
    tripId: string,
    pings: Array<{ latitude: number; longitude: number; recordedAt?: string }>
  ): Observable<{ count: number; message: string }> {
    return this.http.post<{ count: number; message: string }>(
      `${this.baseUrl}/trips/${tripId}/location`,
      { pings },
      { withCredentials: true }
    );
  }

  getHistory(): Observable<DriverHistoryItem[]> {
    return this.http.get<DriverHistoryItem[]>(`${this.baseUrl}/history`, { withCredentials: true }).pipe(
      tap((data) => {
        try {
          localStorage.setItem(DRIVER_HISTORY_KEY, JSON.stringify(data));
        } catch {}
      }),
      catchError((error) => {
        try {
          const cached = localStorage.getItem(DRIVER_HISTORY_KEY);
          if (cached) {
            return of(JSON.parse(cached) as DriverHistoryItem[]);
          }
        } catch {}
        throw error;
      })
    );
  }
}
