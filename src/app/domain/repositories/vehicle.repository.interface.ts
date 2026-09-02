import { Observable } from 'rxjs';
import { Vehicle, CreateVehicleDTO } from '../models/vehicle.model';

export abstract class IVehicleRepository {
  abstract getAll(): Observable<Vehicle[]>;
  abstract getById(id: string): Observable<Vehicle>;
  abstract create(vehicle: CreateVehicleDTO): Observable<Vehicle>;
  abstract update(id: string, vehicle: Partial<CreateVehicleDTO>): Observable<Vehicle>;
  abstract delete(id: string): Observable<void>;
}
