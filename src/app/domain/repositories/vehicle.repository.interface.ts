import { Observable } from 'rxjs';
import { Vehicle, CreateVehicleDTO } from '../models/vehicle.model';

export abstract class IVehicleRepository {
  abstract getAll(): Observable<Vehicle[]>;
  abstract getById(id: string): Observable<Vehicle>;
  abstract getByPlate(plate: string): Observable<Vehicle>;
  abstract create(vehicle: CreateVehicleDTO): Observable<Vehicle>;
  abstract updateKm(id: string, km: number): Observable<Vehicle>;
  abstract sendToMaintenance(id: string): Observable<Vehicle>;
  abstract finishMaintenance(id: string): Observable<Vehicle>;
}
