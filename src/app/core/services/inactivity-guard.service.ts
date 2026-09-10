import { Injectable, signal } from '@angular/core';

export const INACTIVITY_TIMEOUT_MINUTES = 15;

@Injectable({
  providedIn: 'root',
})
export class InactivityGuardService {
  private readonly TIMEOUT_MS = INACTIVITY_TIMEOUT_MINUTES * 60 * 1000;
  private readonly locked = signal<boolean>(false);
  private timerId?: ReturnType<typeof setTimeout>;
  private activeRole: string | null = null;

  readonly isLocked = this.locked.asReadonly();

  start(role?: string | null): void {
    if (!role) return;
    this.activeRole = role;
    if (role === 'DRIVER') {
      return; // Não aplica a motorista
    }
    this.checkPersistedLock();
    if (!this.locked()) {
      this.resetTimer();
    }
  }

  registerActivity(): void {
    if (this.activeRole === 'DRIVER') return;
    if (this.locked()) return; // Não reseta se já estiver travado
    this.resetTimer();
  }

  private resetTimer(): void {
    this.clearTimer();
    if (this.activeRole && this.activeRole !== 'DRIVER' && !this.locked()) {
      this.timerId = setTimeout(() => this.lock(), this.TIMEOUT_MS);
    }
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = undefined;
    }
  }

  lock(): void {
    this.locked.set(true);
    try {
      sessionStorage.setItem('sessionLocked', 'true');
    } catch {}
    this.clearTimer();
  }

  unlock(): void {
    this.locked.set(false);
    try {
      sessionStorage.removeItem('sessionLocked');
    } catch {}
    this.resetTimer();
  }

  checkPersistedLock(): void {
    if (this.activeRole === 'DRIVER') return;
    try {
      if (sessionStorage.getItem('sessionLocked') === 'true') {
        this.locked.set(true);
      }
    } catch {}
  }

  stop(): void {
    this.clearTimer();
    this.locked.set(false);
    this.activeRole = null;
    try {
      sessionStorage.removeItem('sessionLocked');
    } catch {}
  }
}
