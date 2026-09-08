import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IClientRepository } from '../../domain/repositories/client.repository.interface';
import {
  Client,
  OnboardClientDTO,
  OnboardClientResponse,
  UpdateClientDTO,
  ListClientsParams,
  ListClientsResponse,
} from '../../domain/models/client.model';

@Injectable({
  providedIn: 'root',
})
export class HttpClientRepository implements IClientRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/clients`;

  onboard(dto: OnboardClientDTO): Observable<OnboardClientResponse> {
    return this.http.post<OnboardClientResponse>(this.baseUrl, dto, {
      withCredentials: true,
    });
  }

  listAll(params?: ListClientsParams): Observable<ListClientsResponse> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.status) httpParams = httpParams.set('status', params.status);

    return this.http.get<ListClientsResponse>(this.baseUrl, {
      params: httpParams,
      withCredentials: true,
    });
  }

  getById(id: string): Observable<Client> {
    return this.http.get<Client>(`${this.baseUrl}/${id}`, {
      withCredentials: true,
    });
  }

  updateProfile(id: string, dto: UpdateClientDTO): Observable<Client> {
    return this.http.patch<Client>(`${this.baseUrl}/${id}`, dto, {
      withCredentials: true,
    });
  }

  suspend(id: string): Observable<Client> {
    return this.http.patch<Client>(`${this.baseUrl}/${id}/suspend`, {}, {
      withCredentials: true,
    });
  }

  reactivate(id: string): Observable<Client> {
    return this.http.patch<Client>(`${this.baseUrl}/${id}/reactivate`, {}, {
      withCredentials: true,
    });
  }

  cancel(id: string): Observable<Client> {
    return this.http.patch<Client>(`${this.baseUrl}/${id}/cancel`, {}, {
      withCredentials: true,
    });
  }
}
