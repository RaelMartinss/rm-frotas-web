import { Observable } from 'rxjs';
import { Trip, CreateTripDTO, CreateFuelSupplyDTO, FuelSupply } from '../models/trip.model';

export abstract class ITripRepository {
  abstract getAll(): Observable<Trip[]>;
  abstract getById(id: string): Observable<Trip>;
  abstract create(trip: CreateTripDTO): Observable<Trip>;
 
  abstract addFuelSupply(supply: CreateFuelSupplyDTO): Observable<FuelSupply>;
}
