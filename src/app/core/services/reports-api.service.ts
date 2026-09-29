import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CostPerKmFilters {
  from: string;
  to: string;
  vehicleId?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}

export type VehicleCpkStatus = 'OK' | 'ABOVE_AVERAGE' | 'INSUFFICIENT_DATA';
export type InsufficientReason = 'NO_READINGS' | 'KM_REGRESSION' | 'LOW_KM' | 'KM_OUTLIER';

export interface CostPerKmPeriod {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
}

export interface FleetCpkSubtotal {
  vehicles: number;
  fuelCost: string;
  maintenanceCost: string;
  totalCost: string;
  km: number;
  cpk: string | null;
}

export interface FleetCpkInsufficientSubtotal {
  vehicles: number;
  fuelCost: string;
  maintenanceCost: string;
  totalCost: string;
}

export interface CostPerKmSummary {
  totalFuelCost: string;
  totalMaintenanceCost: string;
  totalCost: string;
  eligibleKm: number;
  fleetCpk: string | null;
  fleetComparisonAvailable: boolean;
  eligibleVehicles: number;
  aboveAverageCount: number;
  insufficientDataCount: number;
  eligible: FleetCpkSubtotal;
  insufficient: FleetCpkInsufficientSubtotal;
}

export interface CostPerKmVehicleRow {
  vehicleId: string;
  plate: string;
  model: string;
  year: number;
  fuelCost: string;
  maintenanceCost: string;
  totalCost: string;
  km: number;
  cpk: string | null;
  status: VehicleCpkStatus;
  insufficientReason: InsufficientReason | null;
  deltaVsFleetPercent: number | null;
  deltaVsPreviousPercent: number | null;
}

export interface CostPerKmPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CostPerKmReportResponse {
  period: CostPerKmPeriod;
  summary: CostPerKmSummary;
  rows: CostPerKmVehicleRow[];
  pagination: CostPerKmPagination;
}

@Injectable({
  providedIn: 'root',
})
export class ReportsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reports`;

  getCostPerKm(filters: CostPerKmFilters): Observable<CostPerKmReportResponse> {
    let params = new HttpParams()
      .set('from', filters.from)
      .set('to', filters.to);

    if (filters.vehicleId) {
      params = params.set('vehicleId', filters.vehicleId);
    }
    if (filters.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters.pageSize) {
      params = params.set('pageSize', filters.pageSize.toString());
    }
    if (filters.sort) {
      params = params.set('sort', filters.sort);
    }

    return this.http.get<CostPerKmReportResponse>(`${this.baseUrl}/cost-per-km`, { params });
  }

  exportCostPerKm(filters: CostPerKmFilters, format: string = 'csv'): Observable<Blob> {
    let params = new HttpParams()
      .set('from', filters.from)
      .set('to', filters.to)
      .set('format', format);

    if (filters.vehicleId) {
      params = params.set('vehicleId', filters.vehicleId);
    }
    if (filters.sort) {
      params = params.set('sort', filters.sort);
    }

    return this.http.get(`${this.baseUrl}/cost-per-km/export`, {
      params,
      responseType: 'blob',
    });
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }
}
