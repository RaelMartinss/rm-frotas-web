import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IDriverRepository } from '../../domain/repositories/driver.repository.interface';
import { Driver, CreateDriverDTO } from '../../domain/models/driver.model';

@Injectable({
  providedIn: 'root'
})
export class HttpDriverRepository implements IDriverRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://api.rmfrotas.com.br/v1/drivers';

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

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
