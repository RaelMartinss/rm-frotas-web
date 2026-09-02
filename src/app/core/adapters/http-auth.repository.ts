import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';
import { AuthResponse, LoginCredentials, RegisterUserDTO, User, UpdateProfileDTO, UpdatePasswordDTO } from '../../domain/models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class HttpAuthRepository implements IAuthRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, credentials).pipe(
      tap((response) => {
        localStorage.setItem('access_token', response.accessToken);
        localStorage.setItem('user_info', JSON.stringify(response.user));
      })
    );
  }

  register(user: RegisterUserDTO): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/auth/register`, user);
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  updateProfile(data: UpdateProfileDTO): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/me`, data).pipe(
      tap((user) => {
        localStorage.setItem('user_info', JSON.stringify(user));
      })
    );
  }

  updatePassword(data: UpdatePasswordDTO): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/me/password`, data);
  }
}
