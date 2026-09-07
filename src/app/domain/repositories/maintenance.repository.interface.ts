import { Observable } from 'rxjs';
import {
  CreateMaintenanceRequest,
  FinishMaintenanceRequest,
  ListMaintenancesFilter,
  Maintenance,
  MaintenanceStats,
  PaginatedMaintenanceResult,
  StartMaintenanceRequest,
  UpdateMaintenanceRequest,
} from '../models/maintenance.model';

export abstract class IMaintenanceRepository {
  abstract getAll(filter?: ListMaintenancesFilter): Observable<PaginatedMaintenanceResult>;
  abstract getById(id: string): Observable<Maintenance>;
  abstract getStats(from?: string, to?: string): Observable<MaintenanceStats>;
  abstract create(data: CreateMaintenanceRequest): Observable<Maintenance>;
  abstract start(id: string, data?: StartMaintenanceRequest): Observable<Maintenance>;
  abstract startDirect(data: StartMaintenanceRequest): Observable<Maintenance>;
  abstract finish(id: string, data: FinishMaintenanceRequest): Observable<Maintenance>;
  abstract cancel(id: string, reason?: string): Observable<Maintenance>;
  abstract update(id: string, data: UpdateMaintenanceRequest): Observable<Maintenance>;
}
