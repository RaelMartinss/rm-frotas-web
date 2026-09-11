import { Observable } from 'rxjs';
import { Incident, GetIncidentsQuery } from '../models/incident.model';

export abstract class IIncidentRepository {
  abstract getAll(query?: GetIncidentsQuery): Observable<Incident[]>;
  abstract resolve(id: string): Observable<{ id: string; status: string; message: string }>;
  abstract updateStatus(id: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'): Observable<{ id: string; status: string; message: string }>;
}
