import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { IAuthRepository, LoginCredentials, AuthResponse } from '../../domain/repositories/auth.repository.interface';
import { User } from '../../domain/models/user.model';

@Injectable({ providedIn: 'root' })
export class HttpAuthRepository implements IAuthRepository {
  private readonly apiUrl = 'http://localhost:3000/auth'; // Altere conforme sua API

  constructor(private readonly http: HttpClient) {}

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<{ accessToken: string; user: any }>(`${this.apiUrl}/login`, credentials).pipe(
      map(response => ({
        accessToken: response.accessToken,
        user: new User(response.user)
      }))
    );
  }

  logout(): Observable<void> {
    localStorage.removeItem('access_token');
    return new Observable(subscriber => {
      subscriber.next();
      subscriber.complete();
    });
  }

  getCurrentUser(): Observable<User | null> {
    // Implementação futura via token /me
    return new Observable(subscriber => subscriber.next(null));
  }
}
