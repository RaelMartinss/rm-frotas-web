import { Injectable, computed, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../../domain/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private readonly _accessToken = signal<string | null>(null);
  private readonly _currentUser = signal<User | null>(null);
  private readonly _isInitialized = signal<boolean>(false);

  // Exposição somente leitura dos signals
  readonly accessToken = this._accessToken.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly isInitialized = this._isInitialized.asReadonly();
  readonly isAuthenticated = computed(() => !!this._accessToken());

  // Controle de concorrência para múltiplos 401s simultâneos
  isRefreshing = false;
  readonly refreshTokenSubject = new BehaviorSubject<string | null>(null);

  setSession(token: string, user?: User | null): void {
    this._accessToken.set(token);
    if (user) {
      this._currentUser.set(user);
    }
  }

  setCurrentUser(user: User | null): void {
    this._currentUser.set(user);
  }

  getToken(): string | null {
    return this._accessToken();
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
    this.isRefreshing = false;
    this.refreshTokenSubject.next(null);
  }
}
