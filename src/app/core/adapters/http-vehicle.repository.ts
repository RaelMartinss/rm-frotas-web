import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IVehicleRepository } from '../../domain/repositories/vehicle.repository.interface';
import { Vehicle, CreateVehicleDTO } from '../../domain/models/vehicle.model';

@Injectable({
  providedIn: 'root'
})
export class HttpVehicleRepository implements IVehicleRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/vehicles`;

  getAll(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(this.apiUrl);
  }

  getById(id: string): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.apiUrl}/${id}`);
  }

  getByPlate(plate: string): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.apiUrl}/plate/${plate}`);
  }

  create(vehicle: CreateVehicleDTO): Observable<Vehicle> {
    console.log('Creating vehicle:', vehicle);
    return this.http.post<Vehicle>(this.apiUrl, vehicle);
  }

  updateKm(id: string, km: number): Observable<Vehicle> {
    return this.http.patch<Vehicle>(`${this.apiUrl}/${id}/km`, { km });
  }

  sendToMaintenance(id: string): Observable<Vehicle> {
    return this.http.patch<Vehicle>(`${this.apiUrl}/${id}/maintenance/send`, {});
  }

  finishMaintenance(id: string): Observable<Vehicle> {
    return this.http.patch<Vehicle>(`${this.apiUrl}/${id}/maintenance/finish`, {});
  }
}
