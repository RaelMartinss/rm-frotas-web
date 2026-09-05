import { Injectable, computed, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../../domain/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private readonly TOKEN_KEY = 'rm_frotas_token';
  private readonly USER_KEY = 'rm_frotas_user';

  private readonly _accessToken = signal<string | null>(this.getStoredToken());
  private readonly _currentUser = signal<User | null>(this.getStoredUser());
  private readonly _isInitialized = signal<boolean>(true);

  // Exposição somente leitura dos signals
  readonly accessToken = this._accessToken.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly isInitialized = this._isInitialized.asReadonly();
  readonly isAuthenticated = computed(() => !!this._accessToken());

  // Controle de concorrência para múltiplos 401s simultâneos
  isRefreshing = false;
  readonly refreshTokenSubject = new BehaviorSubject<string | null>(null);

  private getStoredToken(): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(this.TOKEN_KEY) : null;
    } catch {
      return null;
    }
  }

  private getStoredUser(): User | null {
    try {
      const user = typeof localStorage !== 'undefined' ? localStorage.getItem(this.USER_KEY) : null;
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }

  setSession(token: string, user?: User | null): void {
    this._accessToken.set(token);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.TOKEN_KEY, token);
      }
    } catch {}

    if (user) {
      this._currentUser.set(user);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        }
      } catch {}
    }
  }

  setCurrentUser(user: User | null): void {
    this._currentUser.set(user);
    try {
      if (typeof localStorage !== 'undefined') {
        if (user) {
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        } else {
          localStorage.removeItem(this.USER_KEY);
        }
      }
    } catch {}
  }

  getToken(): string | null {
    return this._accessToken() || this.getStoredToken();
  }

  getUser(): User | null {
    return this._currentUser() || this.getStoredUser();
  }

  setInitialized(): void {
    this._isInitialized.set(true);
  }

  clear(): void {
    this._accessToken.set(null);
    this._currentUser.set(null);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
      }
    } catch {}
    this.isRefreshing = false;
    this.refreshTokenSubject.next(null);
  }
}

