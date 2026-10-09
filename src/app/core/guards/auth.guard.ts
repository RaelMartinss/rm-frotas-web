import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { of } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
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

    if (user?.role === 'DRIVER' && (state.url === '/' || state.url === '/dashboard' || state.url === '')) {
      return router.createUrlTree(['/motorista']);
    }

    return true;
  };

  // Se já possui access token ativo em memória, valida o acesso
  if (authState.isAuthenticated()) {
    return checkUserPasswordChange();
  }

  // Se o app já foi inicializado (provideAppInitializer já tentou restaurar sessão), não repete requisição de refresh
  if (authState.isInitialized()) {
    return router.createUrlTree(['/login']);
  }

  // Se a página foi recarregada (F5), recupera a sessão via cookie HttpOnly com timeout estrito
  return authRepository.refresh().pipe(
    timeout({ first: 2500 }),
    map(() => checkUserPasswordChange()),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};


