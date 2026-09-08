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

  const checkUserPasswordChange = () => {
    const user = authState.getUser();
    if (user?.mustChangePassword && !state.url.includes('/trocar-senha-obrigatoria')) {
      return router.createUrlTree(['/trocar-senha-obrigatoria']);
    }
    return true;
  };

  // Se já possui access token ativo em memória, valida o acesso
  if (authState.isAuthenticated()) {
    return checkUserPasswordChange();
  }

  // Se a página foi recarregada (F5), recupera a sessão via cookie HttpOnly
  return authRepository.refresh().pipe(
    map(() => checkUserPasswordChange()),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};


