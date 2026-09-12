import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';
import { AuthStateService } from '../services/auth-state.service';

export const guestGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authRepository = inject(IAuthRepository);
  const authState = inject(AuthStateService);

  if (!authRepository.isAuthenticated()) {
    return true;
  }

  const user = authState.getUser();
  if (user?.role === 'SUPER_ADMIN') {
    return router.createUrlTree(['/clientes']);
  }
  if (user?.role === 'DRIVER') {
    return router.createUrlTree(['/motorista']);
  }

  // Se já estiver autenticado como Gestor/Admin regular, redireciona para a dashboard
  return router.createUrlTree(['/dashboard']);
};

