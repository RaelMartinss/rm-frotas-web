import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { describe, expect, it, beforeEach } from 'vitest';
import { reportsGuard } from './reports.guard';
import { AuthStateService } from '../services/auth-state.service';
import { User } from '../../domain/models/user.model';

describe('reportsGuard', () => {
  let authStateService: AuthStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthStateService,
        {
          provide: Router,
          useValue: {
            createUrlTree: (commands: any[]) => ({ url: commands.join('/') } as unknown as UrlTree),
          },
        },
      ],
    });

    authStateService = TestBed.inject(AuthStateService);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  it('deve redirecionar para /login se o usuário não estiver autenticado', () => {
    authStateService.clear();

    const result = TestBed.runInInjectionContext(() =>
      reportsGuard({} as any, {} as any)
    );

    expect(result).toEqual({ url: '/login' });
  });

  it('deve bloquear e redirecionar para /dashboard se a role for DRIVER', () => {
    authStateService.setCurrentUser({
      id: 'driver-1',
      name: 'João Motorista',
      email: 'joao@frotas.com',
      role: 'DRIVER',
    } as User);

    const result = TestBed.runInInjectionContext(() =>
      reportsGuard({} as any, {} as any)
    );

    expect(result).toEqual({ url: '/dashboard' });
  });

  it('deve permitir acesso para FLEET_MANAGER', () => {
    authStateService.setCurrentUser({
      id: 'manager-1',
      name: 'Maria Gestora',
      email: 'maria@frotas.com',
      role: 'FLEET_MANAGER',
    } as User);

    const result = TestBed.runInInjectionContext(() =>
      reportsGuard({} as any, {} as any)
    );

    expect(result).toBe(true);
  });

  it('deve permitir acesso para ADMIN', () => {
    authStateService.setCurrentUser({
      id: 'admin-1',
      name: 'Carlos Admin',
      email: 'carlos@frotas.com',
      role: 'ADMIN',
    } as User);

    const result = TestBed.runInInjectionContext(() =>
      reportsGuard({} as any, {} as any)
    );

    expect(result).toBe(true);
  });
});
