import { Observable } from 'rxjs';
import { DashboardSummary } from '../models/dashboard.model';

export abstract class IDashboardRepository {
  abstract getSummary(): Observable<DashboardSummary>;
}
