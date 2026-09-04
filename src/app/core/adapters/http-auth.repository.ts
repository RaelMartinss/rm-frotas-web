import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';
import { AuthStateService } from '../services/auth-state.service';
import {
  AuthResponse,
  LoginCredentials,
  RegisterUserDTO,
  User,
  UpdateProfileDTO,
  UpdatePasswordDTO,
  CreateUserDTO,
} from '../../domain/models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class HttpAuthRepository implements IAuthRepository {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);
  private readonly baseUrl = environment.apiUrl;

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/login`, credentials, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          this.authState.setSession(response.accessToken, response.user);
        })
      );
  }

  refresh(): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(
        `${this.baseUrl}/auth/refresh`,
        {},
        { withCredentials: true }
      )
      .pipe(
        tap((response) => {
          this.authState.setSession(response.accessToken, response.user);
        })
      );
  }

  register(user: RegisterUserDTO): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/auth/register`, user, {
      withCredentials: true,
    });
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          this.authState.clear();
        })
      );
  }

  getCurrentUser(): Observable<User | null> {
    const cachedUser = this.authState.getUser();
    if (cachedUser) {
      return of(cachedUser);
    }

    return this.http.get<User>(`${this.baseUrl}/me`, { withCredentials: true }).pipe(
      tap((user) => {
        this.authState.setCurrentUser(user);
      })
    );
  }

  getToken(): string | null {
    return this.authState.getToken();
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated();
  }

  updateProfile(data: UpdateProfileDTO): Observable<User> {
    return this.http
      .put<User>(`${this.baseUrl}/me`, data, { withCredentials: true })
      .pipe(
        tap((user) => {
          this.authState.setCurrentUser(user);
        })
      );
  }

  updatePassword(data: UpdatePasswordDTO): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/me/password`, data, {
      withCredentials: true,
    });
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`, {
      withCredentials: true,
    });
  }

  createUser(user: CreateUserDTO): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/users`, user, {
      withCredentials: true,
    });
  }

  toggleUserStatus(id: string, active: boolean): Observable<User> {
    return this.http.patch<User>(
      `${this.baseUrl}/users/${id}/status`,
      { active },
      { withCredentials: true }
    );
  }
}

