import { Injectable, computed, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { User } from '../../domain/models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  private readonly _accessToken = signal<string | null>(this.getStoredToken());
  private readonly _currentUser = signal<User | null>(this.getStoredUser());
  private readonly _isInitialized = signal<boolean>(false);

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
      return localStorage.getItem('rm_frotas_token');
    } catch {
      return null;
    }
  }

  private getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem('rm_frotas_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  private getStoredRefreshToken(): string | null {
    try {
      return localStorage.getItem('rm_frotas_refresh_token');
    } catch {
      return null;
    }
  }

  setSession(
    token: string,
    user?: User | null,
    refreshToken?: string | null,
  ): void {
    this._accessToken.set(token);
    try {
      localStorage.setItem('rm_frotas_token', token);
      if (refreshToken) {
        localStorage.setItem('rm_frotas_refresh_token', refreshToken);
        if (Capacitor.isNativePlatform()) {
          Preferences.set({
            key: 'rm_frotas_refresh_token',
            value: refreshToken,
          }).catch(() => {});
        }
      }
    } catch {}

    if (user) {
      this._currentUser.set(user);
      try {
        localStorage.setItem('rm_frotas_user', JSON.stringify(user));
      } catch {}
    }
  }

  setCurrentUser(user: User | null): void {
    this._currentUser.set(user);
    try {
      if (user) {
        localStorage.setItem('rm_frotas_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('rm_frotas_user');
      }
    } catch {}
  }

  getToken(): string | null {
    return this._accessToken();
  }

  getRefreshToken(): string | null {
    return this.getStoredRefreshToken();
  }

  getUser(): User | null {
    return this._currentUser();
  }

  setInitialized(): void {
    this._isInitialized.set(true);
  }

  clear(): void {
    this._accessToken.set(null);
    this._currentUser.set(null);
    try {
      localStorage.removeItem('rm_frotas_token');
      localStorage.removeItem('rm_frotas_user');
      localStorage.removeItem('rm_frotas_refresh_token');
      if (Capacitor.isNativePlatform()) {
        Preferences.remove({ key: 'rm_frotas_refresh_token' }).catch(() => {});
      }
    } catch {}
    this.isRefreshing = false;
    this.refreshTokenSubject.next(null);
  }
}
