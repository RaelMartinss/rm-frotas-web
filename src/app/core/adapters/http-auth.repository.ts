import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';
import {
  AuthResponse,
  LoginCredentials,
  RegisterUserDTO,
  UpdatePasswordDTO,
  UpdateProfileDTO,
  User,
} from '../../domain/models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class HttpAuthRepository implements IAuthRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://api.rmfrotas.com.br/v1/auth';

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        localStorage.setItem('access_token', response.accessToken);
        localStorage.setItem('user_info', JSON.stringify(response.user));
      }),
    );
  }

  register(user: RegisterUserDTO): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register`, user);
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`);
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    return !!token;
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  updateProfile(data: UpdateProfileDTO): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/profile`, data).pipe(
      tap((user) => {
        localStorage.setItem('user_info', JSON.stringify(user));
      }),
    );
  }

  updatePassword(data: UpdatePasswordDTO): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/change-password`, data);
  }
}
