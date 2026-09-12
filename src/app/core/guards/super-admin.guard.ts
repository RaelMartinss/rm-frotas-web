import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';

export const superAdminGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  const user = authState.getUser();
  if (user?.role === 'SUPER_ADMIN') {
    return true;
  }

  // Se não estiver logado, direciona para o login do admin
  if (!authState.isAuthenticated()) {
    return router.createUrlTree(['/admin-login']);
  }

  // Se estiver logado com outro papel, redireciona para a área apropriada
  if (user?.role === 'DRIVER') {
    return router.createUrlTree(['/motorista']);
  }

  return router.createUrlTree(['/dashboard']);
};
