import { Observable } from 'rxjs';
import {
  FuelRecord,
  CreateFuelRecordParams,
  UpdateFuelRecordParams,
  FuelFilterParams,
  FuelStats,
  FuelConsumptionReport,
  PaginatedFuelResult,
} from '../models/fuel.model';

export abstract class IFuelRepository {
  abstract create(params: CreateFuelRecordParams): Observable<FuelRecord>;
  abstract update(id: string, params: UpdateFuelRecordParams): Observable<FuelRecord>;
  abstract delete(id: string): Observable<void>;
  abstract getById(id: string): Observable<FuelRecord>;
  abstract list(params?: FuelFilterParams): Observable<PaginatedFuelResult>;
  abstract getConsumptionReport(params?: {
    vehicleId?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<FuelConsumptionReport>;
  abstract getCostStats(params?: {
    vehicleId?: string;
    driverId?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<FuelStats>;
}
