import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, tap, map, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';
import { AuthStateService } from '../services/auth-state.service';
import {
  AuthResponse,
  ChangePasswordDTO,
  CreateUserDTO,
  CreateUserResponse,
  LoginCredentials,
  RegisterUserDTO,
  ResetUserPasswordResponse,
  UpdatePasswordDTO,
  UpdateProfileDTO,
  User,
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
          this.authState.setSession(response.accessToken, response.user, response.refreshToken);
        })
      );
  }

  refresh(): Observable<AuthResponse> {
    const refreshToken = this.authState.getRefreshToken();
    return this.http
      .post<AuthResponse>(
        `${this.baseUrl}/auth/refresh`,
        refreshToken ? { refreshToken } : {},
        { withCredentials: true }
      )
      .pipe(
        tap((response) => {
          this.authState.setSession(response.accessToken, response.user, response.refreshToken);
        })
      );
  }

  register(user: RegisterUserDTO): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/auth/register`, user, {
      withCredentials: true,
    });
  }

  logout(): Observable<void> {
    const refreshToken = this.authState.getRefreshToken();
    return this.http
      .post<void>(
        `${this.baseUrl}/auth/logout`,
        refreshToken ? { refreshToken } : {},
        { withCredentials: true }
      )
      .pipe(
        tap(() => {
          this.authState.clear();
        }),
        catchError(() => {
          this.authState.clear();
          return of(void 0);
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

  changePassword(data: ChangePasswordDTO): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/auth/change-password`, data, {
        withCredentials: true,
      })
      .pipe(
        tap(() => {
          const user = this.authState.getUser();
          if (user) {
            this.authState.setCurrentUser({
              ...user,
              mustChangePassword: false,
            } as User);
          }
        })
      );
  }

  getUsers(clientId?: string): Observable<User[]> {
    let params = new HttpParams();
    if (clientId) {
      params = params.set('clientId', clientId);
    }
    return this.http.get<User[]>(`${this.baseUrl}/users`, {
      params,
      withCredentials: true,
    });
  }

  createUser(user: CreateUserDTO): Observable<CreateUserResponse> {
    return this.http
      .post<any>(`${this.baseUrl}/users`, user, {
        withCredentials: true,
      })
      .pipe(
        map((res) => {
          const userEntity = res.user
            ? res.user
            : new User({
                id: res.id,
                name: res.name,
                email: res.email,
                role: res.role,
                clientId: res.clientId,
                status: 'ACTIVE',
                isActive: true,
                mustChangePassword: true,
              });

          return {
            user: userEntity,
            temporaryPassword: res.temporaryPassword,
          };
        })
      );
  }

  resetUserPassword(id: string): Observable<ResetUserPasswordResponse> {
    return this.http.post<ResetUserPasswordResponse>(
      `${this.baseUrl}/users/${id}/reset-password`,
      {},
      { withCredentials: true }
    );
  }

  toggleUserStatus(id: string, active: boolean): Observable<User> {
    return this.http.patch<User>(
      `${this.baseUrl}/users/${id}/status`,
      { active },
      { withCredentials: true }
    );
  }
}

