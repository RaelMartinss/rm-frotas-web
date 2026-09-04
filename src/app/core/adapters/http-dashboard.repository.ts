import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IDashboardRepository } from '../../domain/repositories/dashboard.repository.interface';
import { DashboardSummary } from '../../domain/models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class HttpDashboardRepository implements IDashboardRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/dashboard/summary`;

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(this.apiUrl);
  }
}

