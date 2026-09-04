import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';

export const authGuard: CanActivateFn = (route, state) => {
  const authRepository = inject(IAuthRepository);
  const router = inject(Router);

  if (authRepository.isAuthenticated()) {
    return true;
  }

  // Redireciona diretamente para /login
  return router.createUrlTree(['/login']);
};

