import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';

export const guestGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authRepository = inject(IAuthRepository);

  if (!authRepository.isAuthenticated()) {
    return true;
  }

  // Se já estiver autenticado, redireciona para a dashboard
  return router.createUrlTree(['/dashboard']);
};

