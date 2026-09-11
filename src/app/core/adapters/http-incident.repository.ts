import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Incident, GetIncidentsQuery } from '../../domain/models/incident.model';
import { IIncidentRepository } from '../../domain/repositories/incident.repository.interface';

@Injectable({
  providedIn: 'root'
})
export class HttpIncidentRepository implements IIncidentRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/incidents`;

  getAll(query?: GetIncidentsQuery): Observable<Incident[]> {
    let params = new HttpParams();
    if (query?.status) {
      params = params.set('status', query.status);
    }
    if (query?.tripId) {
      params = params.set('tripId', query.tripId);
    }
    return this.http.get<Incident[]>(this.baseUrl, { params });
  }

  resolve(id: string): Observable<{ id: string; status: string; message: string }> {
    return this.http.patch<{ id: string; status: string; message: string }>(
      `${this.baseUrl}/${id}/resolve`,
      {}
    );
  }

  updateStatus(
    id: string,
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
  ): Observable<{ id: string; status: string; message: string }> {
    return this.http.patch<{ id: string; status: string; message: string }>(
      `${this.baseUrl}/${id}/status`,
      { status }
    );
  }
}
