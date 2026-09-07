import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IFuelRepository } from '../../domain/repositories/fuel.repository.interface';
import {
  FuelRecord,
  CreateFuelRecordParams,
  UpdateFuelRecordParams,
  FuelFilterParams,
  FuelStats,
  FuelConsumptionReport,
  PaginatedFuelResult,
} from '../../domain/models/fuel.model';

@Injectable({
  providedIn: 'root',
})
export class HttpFuelRepository implements IFuelRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/fuel-records`;

  create(params: CreateFuelRecordParams): Observable<FuelRecord> {
    return this.http.post<FuelRecord>(this.apiUrl, params);
  }

  update(id: string, params: UpdateFuelRecordParams): Observable<FuelRecord> {
    return this.http.patch<FuelRecord>(`${this.apiUrl}/${id}`, params);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getById(id: string): Observable<FuelRecord> {
    return this.http.get<FuelRecord>(`${this.apiUrl}/${id}`);
  }

  list(filter?: FuelFilterParams): Observable<PaginatedFuelResult> {
    let httpParams = new HttpParams();

    if (filter) {
      if (filter.page !== undefined) httpParams = httpParams.set('page', filter.page.toString());
      if (filter.limit !== undefined) httpParams = httpParams.set('limit', filter.limit.toString());
      if (filter.vehicleId) httpParams = httpParams.set('vehicleId', filter.vehicleId);
      if (filter.driverId) httpParams = httpParams.set('driverId', filter.driverId);
      if (filter.fuelType) httpParams = httpParams.set('fuelType', filter.fuelType);
      if (filter.fullTank !== undefined) httpParams = httpParams.set('fullTank', filter.fullTank.toString());
      if (filter.startDate) httpParams = httpParams.set('startDate', filter.startDate);
      if (filter.endDate) httpParams = httpParams.set('endDate', filter.endDate);
      if (filter.search) httpParams = httpParams.set('search', filter.search);
    }

    return this.http.get<PaginatedFuelResult>(this.apiUrl, { params: httpParams });
  }

  getConsumptionReport(params?: {
    vehicleId?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<FuelConsumptionReport> {
    let httpParams = new HttpParams();
    if (params?.vehicleId) httpParams = httpParams.set('vehicleId', params.vehicleId);
    if (params?.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params?.endDate) httpParams = httpParams.set('endDate', params.endDate);

    return this.http.get<FuelConsumptionReport>(`${this.apiUrl}/consumption-report`, {
      params: httpParams,
    });
  }

  getCostStats(params?: {
    vehicleId?: string;
    driverId?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<FuelStats> {
    let httpParams = new HttpParams();
    if (params?.vehicleId) httpParams = httpParams.set('vehicleId', params.vehicleId);
    if (params?.driverId) httpParams = httpParams.set('driverId', params.driverId);
    if (params?.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params?.endDate) httpParams = httpParams.set('endDate', params.endDate);

    return this.http.get<FuelStats>(`${this.apiUrl}/cost-stats`, { params: httpParams });
  }
}
