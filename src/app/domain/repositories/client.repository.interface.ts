import { Observable } from 'rxjs';
import {
  Client,
  OnboardClientDTO,
  OnboardClientResponse,
  UpdateClientDTO,
  ListClientsParams,
  ListClientsResponse,
} from '../models/client.model';

export abstract class IClientRepository {
  abstract onboard(dto: OnboardClientDTO): Observable<OnboardClientResponse>;
  abstract listAll(params?: ListClientsParams): Observable<ListClientsResponse>;
  abstract getById(id: string): Observable<Client>;
  abstract updateProfile(id: string, dto: UpdateClientDTO): Observable<Client>;
  abstract suspend(id: string): Observable<Client>;
  abstract reactivate(id: string): Observable<Client>;
  abstract cancel(id: string): Observable<Client>;
}
