import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IVehicleRepository } from '../../domain/repositories/vehicle.repository.interface';
import { Vehicle, CreateVehicleDTO } from '../../domain/models/vehicle.model';
import { PaginatedResponse, PaginationParams } from '../../domain/models/pagination.model';

@Injectable({
  providedIn: 'root'
})
export class HttpVehicleRepository implements IVehicleRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/vehicles`;

  getAll(params?: PaginationParams): Observable<PaginatedResponse<Vehicle>> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.search && params.search.trim()) httpParams = httpParams.set('search', params.search.trim());
      if (params.status && params.status !== 'ALL') httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<PaginatedResponse<Vehicle>>(this.apiUrl, { params: httpParams });
  }

  getById(id: string): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.apiUrl}/${id}`);
  }

  getByPlate(plate: string): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.apiUrl}/plate/${plate}`);
  }

  create(vehicle: CreateVehicleDTO): Observable<Vehicle> {
    return this.http.post<Vehicle>(this.apiUrl, vehicle);
  }

  updateKm(id: string, km: number): Observable<Vehicle> {
    return this.http.patch<Vehicle>(`${this.apiUrl}/${id}/km`, { currentKm: km });
  }

  sendToMaintenance(id: string): Observable<Vehicle> {
    return this.http.patch<Vehicle>(`${this.apiUrl}/${id}/maintenance/send`, {});
  }

  finishMaintenance(id: string): Observable<Vehicle> {
    return this.http.patch<Vehicle>(`${this.apiUrl}/${id}/maintenance/finish`, {});
  }
}
