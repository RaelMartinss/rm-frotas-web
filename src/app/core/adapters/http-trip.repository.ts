import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ITripRepository } from '../../domain/repositories/trip.repository.interface';
import { Trip, CreateTripDTO, CreateFuelSupplyDTO, FuelSupply } from '../../domain/models/trip.model';

@Injectable({
  providedIn: 'root'
})
export class HttpTripRepository implements ITripRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://api.rmfrotas.com.br/v1/trips';

  getAll(): Observable<Trip[]> {
    return this.http.get<Trip[]>(this.apiUrl);
  }

  getById(id: string): Observable<Trip> {
    return this.http.get<Trip>(`${this.apiUrl}/${id}`);
  }

  create(trip: CreateTripDTO): Observable<Trip> {
    return this.http.post<Trip>(this.apiUrl, trip);
  }

  finishTrip(id: string, finalOdometer: number): Observable<Trip> {
    return this.http.patch<Trip>(`${this.apiUrl}/${id}/finish`, { finalOdometer });
  }

  addFuelSupply(supply: CreateFuelSupplyDTO): Observable<FuelSupply> {
    return this.http.post<FuelSupply>(`${this.apiUrl}/${supply.tripId}/supplies`, supply);
  }
}
