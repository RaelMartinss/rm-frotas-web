import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ITripRepository } from '../../domain/repositories/trip.repository.interface';
import { Trip, CreateTripDTO, CreateFuelSupplyDTO, FuelSupply } from '../../domain/models/trip.model';

@Injectable({
  providedIn: 'root'
})
export class HttpTripRepository implements ITripRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/trips`;

  getAll(): Observable<Trip[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((res) => (Array.isArray(res) ? res : res?.data ?? []))
    );
  }

  getById(id: string): Observable<Trip> {
    return this.http.get<Trip>(`${this.apiUrl}/${id}`);
  }

  create(trip: CreateTripDTO): Observable<Trip> {
    return this.http.post<Trip>(this.apiUrl, trip);
  }

  startTrip(id: string): Observable<Trip> {
    return this.http.patch<Trip>(`${this.apiUrl}/${id}/start`, {});
  }

  completeTrip(id: string, finalOdometer: number): Observable<Trip> {
    return this.http.patch<Trip>(`${this.apiUrl}/${id}/complete`, { finalOdometer });
  }

  cancelTrip(id: string): Observable<Trip> {
    return this.http.patch<Trip>(`${this.apiUrl}/${id}/cancel`, {});
  }

  addFuelSupply(supply: CreateFuelSupplyDTO): Observable<FuelSupply> {
    return this.http.post<FuelSupply>(`${this.apiUrl}/${supply.tripId}/supplies`, supply);
  }
}
