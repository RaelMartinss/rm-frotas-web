import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ITripRepository } from '../../domain/repositories/trip.repository.interface';
import { Trip, CreateTripDTO, CreateFuelSupplyDTO, FuelSupply, TripAvailability } from '../../domain/models/trip.model';
import { PaginatedResponse, PaginationParams } from '../../domain/models/pagination.model';

@Injectable({
  providedIn: 'root'
})
export class HttpTripRepository implements ITripRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/trips`;

  getAll(params?: PaginationParams): Observable<PaginatedResponse<Trip>> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.search && params.search.trim()) httpParams = httpParams.set('search', params.search.trim());
      if (params.status && params.status !== 'ALL') httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<PaginatedResponse<Trip>>(this.apiUrl, { params: httpParams });
  }

  getById(id: string): Observable<Trip> {
    return this.http.get<Trip>(`${this.apiUrl}/${id}`);
  }

  getAvailability(excludeTripId?: string): Observable<TripAvailability> {
    let httpParams = new HttpParams();
    if (excludeTripId) {
      httpParams = httpParams.set('excludeTripId', excludeTripId);
    }
    return this.http.get<TripAvailability>(`${this.apiUrl}/availability`, { params: httpParams });
  }

  create(trip: CreateTripDTO): Observable<Trip> {
    return this.http.post<Trip>(this.apiUrl, trip);
  }

  startTrip(id: string): Observable<Trip> {
    return this.http.patch<Trip>(`${this.apiUrl}/${id}/start`, {});
  }

  completeTrip(id: string): Observable<Trip> {
    return this.http.patch<Trip>(`${this.apiUrl}/${id}/complete`, {});
  }

  cancelTrip(id: string): Observable<Trip> {
    return this.http.patch<Trip>(`${this.apiUrl}/${id}/cancel`, {});
  }

  addFuelSupply(supply: CreateFuelSupplyDTO): Observable<FuelSupply> {
    return this.http.post<FuelSupply>(`${this.apiUrl}/${supply.tripId}/supplies`, supply);
  }
}
