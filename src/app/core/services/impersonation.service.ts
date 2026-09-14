import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';

export interface ImpersonationSessionData {
  id: string;
  targetClientId: string;
  targetClientName: string;
  targetClientDocument: string;
  startedAt: string;
  expiresAt: string;
  scope: 'READ_ONLY';
  remainingSeconds: number;
}

export interface StartImpersonationResponse {
  accessToken: string;
  session: ImpersonationSessionData;
}

export interface ActiveImpersonationResponse {
  active: boolean;
  session: ImpersonationSessionData | null;
}

export interface AuditLogEntry {
  log: {
    id: string;
    impersonationSessionId?: string | null;
    actorUserId: string;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    metadata?: any;
    createdAt: string;
  };
  actor: {
    id: string;
    name: string;
    email: string;
  };
  impersonationSession?: {
    id: string;
    targetClientId: string;
    targetClientName?: string;
  } | null;
}

export interface PaginatedAuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root',
})
export class ImpersonationService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  private readonly TOKEN_KEY = 'rm_frotas_impersonation_token';
  private readonly SESSION_KEY = 'rm_frotas_impersonation_session';

  private timerInterval: any = null;

  readonly activeSession = signal<ImpersonationSessionData | null>(this.getStoredSession());
  readonly remainingSeconds = signal<number>(this.calculateInitialRemaining());
  readonly isImpersonating = computed(() => !!this.activeSession());
  readonly isReadOnly = computed(() => this.isImpersonating());

  readonly formattedRemainingTime = computed(() => {
    const total = this.remainingSeconds();
    if (total <= 0) return '00:00';
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  });

  constructor() {
    if (this.activeSession()) {
      this.startCountdownTimer();
    }
  }

  getImpersonationToken(): string | null {
    try {
      return sessionStorage.getItem(this.TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private getStoredSession(): ImpersonationSessionData | null {
    try {
      const data = sessionStorage.getItem(this.SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private calculateInitialRemaining(): number {
    const session = this.getStoredSession();
    if (!session || !session.expiresAt) return 0;
    const diff = Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  }

  startImpersonation(clientId: string): Observable<StartImpersonationResponse> {
    return this.http
      .post<StartImpersonationResponse>(`${environment.apiUrl}/support/impersonate/${clientId}`, {})
      .pipe(
        tap((response) => {
          sessionStorage.setItem(this.TOKEN_KEY, response.accessToken);
          sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(response.session));
          this.activeSession.set(response.session);
          this.remainingSeconds.set(response.session.remainingSeconds);
          this.startCountdownTimer();
        }),
      );
  }

  endImpersonation(reason = 'MANUAL_LOGOUT'): Observable<any> {
    const token = this.getImpersonationToken();
    const endpoint = `${environment.apiUrl}/support/impersonate/end`;

    // Chama o backend para registrar o encerramento no log
    return this.http.post(endpoint, { reason }).pipe(
      catchError(() => of({ success: true })),
      tap(() => {
        this.clearSession();
        this.toast.info('Modo suporte encerrado.');
        this.router.navigate(['/clientes']);
      }),
    );
  }

  clearSession(): void {
    this.stopCountdownTimer();
    try {
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.SESSION_KEY);
    } catch {}
    this.activeSession.set(null);
    this.remainingSeconds.set(0);
  }

  handleExpired(): void {
    this.clearSession();
    this.toast.warning('A sessão de suporte de 45 minutos expirou.');
    this.router.navigate(['/clientes']);
  }

  private startCountdownTimer(): void {
    this.stopCountdownTimer();

    this.timerInterval = setInterval(() => {
      const current = this.remainingSeconds();
      if (current <= 1) {
        this.stopCountdownTimer();
        this.remainingSeconds.set(0);
        this.handleExpired();
      } else {
        this.remainingSeconds.set(current - 1);
      }
    }, 1000);
  }

  private stopCountdownTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  getAuditLogs(params: {
    clientId?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Observable<PaginatedAuditLogsResponse> {
    let httpParams = new HttpParams();
    if (params.clientId) httpParams = httpParams.set('clientId', params.clientId);
    if (params.action) httpParams = httpParams.set('action', params.action);
    if (params.from) httpParams = httpParams.set('from', params.from);
    if (params.to) httpParams = httpParams.set('to', params.to);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<PaginatedAuditLogsResponse>(`${environment.apiUrl}/support/audit-log`, {
      params: httpParams,
    });
  }
}
