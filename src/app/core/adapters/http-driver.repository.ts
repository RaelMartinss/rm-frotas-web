import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IDriverRepository, UpdateDriverCnhDTO } from '../../domain/repositories/driver.repository.interface';
import { Driver, CreateDriverDTO } from '../../domain/models/driver.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HttpDriverRepository implements IDriverRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/drivers`;

  getAll(): Observable<Driver[]> {
    return this.http.get<Driver[]>(this.apiUrl);
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
