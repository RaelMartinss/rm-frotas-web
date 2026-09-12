import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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
  private readonly baseUrl = `${environment.apiUrl}/clients`;

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

    return this.http
      .get<any>(this.baseUrl, {
        params: httpParams,
        withCredentials: true,
      })
      .pipe(
        map((res: any) => {
          const clientList = res?.clients || res?.data || [];
          const total = res?.total ?? (Array.isArray(clientList) ? clientList.length : 0);
          const limit = params?.limit ?? res?.limit ?? 10;
          return {
            clients: Array.isArray(clientList) ? clientList : [],
            total,
            page: params?.page ?? res?.page ?? 1,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
          };
        }),
      );
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
