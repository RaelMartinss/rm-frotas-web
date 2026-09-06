import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IDriverRepository, UpdateDriverCnhDTO } from '../../domain/repositories/driver.repository.interface';
import { Driver, CreateDriverDTO } from '../../domain/models/driver.model';
import { PaginatedResponse, PaginationParams } from '../../domain/models/pagination.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HttpDriverRepository implements IDriverRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/drivers`;

  getAll(params?: PaginationParams): Observable<PaginatedResponse<Driver>> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.search && params.search.trim()) httpParams = httpParams.set('search', params.search.trim());
      if (params.status && params.status !== 'ALL') httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<PaginatedResponse<Driver>>(this.apiUrl, { params: httpParams });
  }

  getById(id: string): Observable<Driver> {
    return this.http.get<Driver>(`${this.apiUrl}/${id}`);
  }

  create(driver: CreateDriverDTO): Observable<Driver> {
    return this.http.post<Driver>(this.apiUrl, driver);
  }

  update(id: string, driver: Partial<CreateDriverDTO>): Observable<Driver> {
    return this.http.patch<Driver>(`${this.apiUrl}/${id}`, driver);
  }

  activate(id: string): Observable<Driver> {
    return this.http.patch<Driver>(`${this.apiUrl}/${id}/activate`, {});
  }

  deactivate(id: string): Observable<Driver> {
    return this.http.patch<Driver>(`${this.apiUrl}/${id}/deactivate`, {});
  }

  suspend(id: string): Observable<Driver> {
    return this.http.patch<Driver>(`${this.apiUrl}/${id}/suspend`, {});
  }

  updateCnh(id: string, data: UpdateDriverCnhDTO): Observable<Driver> {
    return this.http.patch<Driver>(`${this.apiUrl}/${id}/cnh`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
