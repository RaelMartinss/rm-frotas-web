import { Observable } from 'rxjs';
import { Vehicle, CreateVehicleDTO, VehicleImportResult } from '../models/vehicle.model';
import { PaginatedResponse, PaginationParams } from '../models/pagination.model';

export abstract class IVehicleRepository {
  abstract getAll(params?: PaginationParams): Observable<PaginatedResponse<Vehicle>>;
  abstract getById(id: string): Observable<Vehicle>;
  abstract getByPlate(plate: string): Observable<Vehicle>;
  abstract create(vehicle: CreateVehicleDTO): Observable<Vehicle>;
  abstract importCsv(file: File): Observable<VehicleImportResult>;
  abstract updateKm(id: string, km: number): Observable<Vehicle>;
  abstract updateCrlv(id: string, crlvExpiration: string): Observable<Vehicle>;
  abstract sendToMaintenance(id: string): Observable<Vehicle>;
  abstract finishMaintenance(id: string): Observable<Vehicle>;
}
