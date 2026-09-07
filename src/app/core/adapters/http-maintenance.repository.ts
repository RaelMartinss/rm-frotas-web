import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IMaintenanceRepository } from '../../domain/repositories/maintenance.repository.interface';
import {
  CreateMaintenanceRequest,
  FinishMaintenanceRequest,
  ListMaintenancesFilter,
  Maintenance,
  MaintenanceStats,
  PaginatedMaintenanceResult,
  StartMaintenanceRequest,
  UpdateMaintenanceRequest,
} from '../../domain/models/maintenance.model';

@Injectable({
  providedIn: 'root',
})
export class HttpMaintenanceRepository implements IMaintenanceRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/maintenances`;

  getAll(filter?: ListMaintenancesFilter): Observable<PaginatedMaintenanceResult> {
    let httpParams = new HttpParams();

    if (filter) {
      if (filter.page !== undefined) httpParams = httpParams.set('page', filter.page.toString());
      if (filter.limit !== undefined) httpParams = httpParams.set('limit', filter.limit.toString());
      if (filter.vehicleId) httpParams = httpParams.set('vehicleId', filter.vehicleId);
      if (filter.status && filter.status !== 'ALL') httpParams = httpParams.set('status', filter.status);
      if (filter.type && filter.type !== 'ALL') httpParams = httpParams.set('type', filter.type);
      if (filter.from) httpParams = httpParams.set('from', filter.from);
      if (filter.to) httpParams = httpParams.set('to', filter.to);
    }

    return this.http.get<PaginatedMaintenanceResult>(this.apiUrl, { params: httpParams });
  }

  getById(id: string): Observable<Maintenance> {
    return this.http.get<Maintenance>(`${this.apiUrl}/${id}`);
  }

  getStats(from?: string, to?: string): Observable<MaintenanceStats> {
    let httpParams = new HttpParams();
    if (from) httpParams = httpParams.set('from', from);
    if (to) httpParams = httpParams.set('to', to);

    return this.http.get<MaintenanceStats>(`${this.apiUrl}/stats`, { params: httpParams });
  }

  create(data: CreateMaintenanceRequest): Observable<Maintenance> {
    return this.http.post<Maintenance>(this.apiUrl, data);
  }

  start(id: string, data?: StartMaintenanceRequest): Observable<Maintenance> {
    return this.http.post<Maintenance>(`${this.apiUrl}/${id}/start`, data ?? {});
  }

  startDirect(data: StartMaintenanceRequest): Observable<Maintenance> {
    return this.http.post<Maintenance>(`${this.apiUrl}/start`, data);
  }

  finish(id: string, data: FinishMaintenanceRequest): Observable<Maintenance> {
    return this.http.post<Maintenance>(`${this.apiUrl}/${id}/finish`, data);
  }

  cancel(id: string, reason?: string): Observable<Maintenance> {
    return this.http.post<Maintenance>(`${this.apiUrl}/${id}/cancel`, { reason });
  }

  update(id: string, data: UpdateMaintenanceRequest): Observable<Maintenance> {
    return this.http.patch<Maintenance>(`${this.apiUrl}/${id}`, data);
  }
}
