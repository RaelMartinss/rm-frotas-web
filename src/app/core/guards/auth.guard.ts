import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';
import { AuthStateService } from '../services/auth-state.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authRepository = inject(IAuthRepository);
  const authState = inject(AuthStateService);
  const router = inject(Router);

  // Se já possui access token ativo em memória, permite o acesso imediato
  if (authState.isAuthenticated()) {
    return true;
  }

  // Se a página foi recarregada (F5), recupera o access token via cookie HttpOnly
  return authRepository.refresh().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};


