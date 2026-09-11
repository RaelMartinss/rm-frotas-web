import { Observable } from 'rxjs';
import {
  DriverPortalSummary,
  StartTripDTO,
  CompleteTripDTO,
  DriverFuelDTO,
  DriverIncidentDTO,
  DriverIncidentResponse,
  DriverHistoryItem,
  DriverFuelHistoryItem,
} from '../models/driver-portal.model';

export abstract class IDriverPortalRepository {
  abstract getCurrentTrip(): Observable<DriverPortalSummary>;
  abstract startTrip(dto: StartTripDTO): Observable<{ message: string; tripId: string; status: string }>;
  abstract completeTrip(dto: CompleteTripDTO): Observable<{ message: string; tripId: string; status: string }>;
  abstract registerFuel(dto: DriverFuelDTO): Observable<{ message: string; id: string; totalCost: number }>;
  abstract reportIncident(dto: DriverIncidentDTO): Observable<DriverIncidentResponse>;
  abstract saveChecklist(tripId: string, checklist: any): Observable<{ message: string; tripId: string; checklist: any }>;
  abstract sendLocationPings(
    tripId: string,
    pings: Array<{ latitude: number; longitude: number; recordedAt?: string }>
  ): Observable<{ count: number; message: string }>;
  abstract getHistory(): Observable<DriverHistoryItem[]>;
  abstract getFuelHistory(params?: { pendingReceiptOnly?: boolean }): Observable<DriverFuelHistoryItem[]>;
  abstract updateFuelReceipt(
    id: string,
    receiptUrl: string,
    notes?: string,
    gasStation?: string
  ): Observable<{ message: string; id: string; receiptUrl: string }>;
  abstract registerPushToken(token: string): Observable<{ success: boolean; message: string }>;
}
