import { Observable } from 'rxjs';
import { Driver, CreateDriverDTO } from '../models/driver.model';

export abstract class IDriverRepository {
  abstract getAll(): Observable<Driver[]>;
  abstract getById(id: string): Observable<Driver>;
  abstract create(driver: CreateDriverDTO): Observable<Driver>;
  abstract update(id: string, driver: Partial<CreateDriverDTO>): Observable<Driver>;
  abstract delete(id: string): Observable<void>;
}
