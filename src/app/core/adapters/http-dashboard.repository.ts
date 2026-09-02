import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IDashboardRepository } from '../../domain/repositories/dashboard.repository.interface';
import { DashboardSummary } from '../../domain/models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class HttpDashboardRepository implements IDashboardRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://api.rmfrotas.com.br/v1/dashboard/summary'; // Ajuste o endpoint da sua API

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(this.apiUrl);
  }
}
