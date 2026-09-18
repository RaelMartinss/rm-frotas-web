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
  GetEfficiencyReportParams,
  FuelEfficiencyReportResponse,
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

  list(params?: FuelFilterParams): Observable<PaginatedFuelResult> {
    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.vehicleId) httpParams = httpParams.set('vehicleId', params.vehicleId);
    if (params?.driverId) httpParams = httpParams.set('driverId', params.driverId);
    if (params?.fuelType) httpParams = httpParams.set('fuelType', params.fuelType);
    if (params?.fullTank !== undefined) httpParams = httpParams.set('fullTank', String(params.fullTank));
    if (params?.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params?.endDate) httpParams = httpParams.set('endDate', params.endDate);
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());

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

    return this.http.get<FuelConsumptionReport>(`${this.apiUrl}/consumption-report`, { params: httpParams });
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

  getEfficiencyReport(params?: GetEfficiencyReportParams): Observable<FuelEfficiencyReportResponse> {
    let httpParams = new HttpParams();
    if (params?.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params?.endDate) httpParams = httpParams.set('endDate', params.endDate);
    if (params?.vehicleId) httpParams = httpParams.set('vehicleId', params.vehicleId);
    if (params?.fuelType) httpParams = httpParams.set('fuelType', params.fuelType);
    if (params?.comparePreviousPeriod !== undefined) {
      httpParams = httpParams.set('comparePreviousPeriod', String(params.comparePreviousPeriod));
    }

    return this.http.get<FuelEfficiencyReportResponse>(`${this.apiUrl}/reports/efficiency`, {
      params: httpParams,
    });
  }
}
