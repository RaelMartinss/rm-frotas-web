import { Observable } from 'rxjs';
import {
  DriverPortalSummary,
  StartTripDTO,
  CompleteTripDTO,
  DriverFuelDTO,
  DriverIncidentDTO,
  DriverHistoryItem,
} from '../models/driver-portal.model';

export abstract class IDriverPortalRepository {
  abstract getCurrentTrip(): Observable<DriverPortalSummary>;
  abstract startTrip(dto: StartTripDTO): Observable<{ message: string; tripId: string; status: string }>;
  abstract completeTrip(dto: CompleteTripDTO): Observable<{ message: string; tripId: string; status: string }>;
  abstract registerFuel(dto: DriverFuelDTO): Observable<{ message: string; id: string; totalCost: number }>;
  abstract reportIncident(dto: DriverIncidentDTO): Observable<{ message: string; category: string }>;
  abstract sendLocationPings(
    tripId: string,
    pings: Array<{ latitude: number; longitude: number; recordedAt?: string }>
  ): Observable<{ count: number; message: string }>;
  abstract getHistory(): Observable<DriverHistoryItem[]>;
}
