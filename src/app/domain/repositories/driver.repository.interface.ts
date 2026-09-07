import { Observable } from 'rxjs';
import {
  Driver,
  CreateDriverDTO,
  CnhCategory,
  DriverSuspension,
  SuspendDriverDTO,
  LiftSuspensionDTO,
} from '../models/driver.model';
import { PaginatedResponse, PaginationParams } from '../models/pagination.model';

export interface UpdateDriverCnhDTO {
  cnhNumber: string;
  cnhCategory: CnhCategory;
  cnhExpirationDate: string;
}

export abstract class IDriverRepository {
  abstract getAll(params?: PaginationParams): Observable<PaginatedResponse<Driver>>;
  abstract getById(id: string): Observable<Driver>;
  abstract create(driver: CreateDriverDTO): Observable<Driver>;
  abstract update(id: string, driver: Partial<CreateDriverDTO>): Observable<Driver>;
  abstract activate(id: string): Observable<Driver>;
  abstract deactivate(id: string): Observable<Driver>;
  abstract suspend(id: string, data?: SuspendDriverDTO): Observable<DriverSuspension | Driver>;
  abstract liftSuspension(id: string, data?: LiftSuspensionDTO): Observable<DriverSuspension>;
  abstract getDriverSuspensions(id: string, params?: PaginationParams): Observable<PaginatedResponse<DriverSuspension>>;
  abstract getActiveSuspension(id: string): Observable<DriverSuspension | null>;
  abstract getActiveSuspensions(params?: PaginationParams): Observable<PaginatedResponse<DriverSuspension>>;
  abstract updateCnh(id: string, data: UpdateDriverCnhDTO): Observable<Driver>;
  abstract delete(id: string): Observable<void>;
}
