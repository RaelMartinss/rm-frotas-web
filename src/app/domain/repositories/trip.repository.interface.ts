import { Observable } from 'rxjs';
import { Trip, CreateTripDTO, CreateFuelSupplyDTO, FuelSupply, TripAvailability, TripRouteResponse } from '../models/trip.model';
import { PaginatedResponse, PaginationParams } from '../models/pagination.model';

export abstract class ITripRepository {
  abstract getAll(params?: PaginationParams): Observable<PaginatedResponse<Trip>>;
  abstract getById(id: string): Observable<Trip>;
  abstract getAvailability(excludeTripId?: string): Observable<TripAvailability>;
  abstract getTripRoute(tripId: string): Observable<TripRouteResponse>;
  abstract create(trip: CreateTripDTO): Observable<Trip>;
  abstract startTrip(id: string): Observable<Trip>;
  abstract completeTrip(id: string): Observable<Trip>;
  abstract cancelTrip(id: string): Observable<Trip>;
  abstract addFuelSupply(supply: CreateFuelSupplyDTO): Observable<FuelSupply>;
}
