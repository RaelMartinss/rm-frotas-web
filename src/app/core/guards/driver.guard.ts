import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';

export const driverGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  const user = authState.getUser();
  if (!user) {
    return router.createUrlTree(['/login']);
  }

  if (user.mustChangePassword) {
    return router.createUrlTree(['/trocar-senha-obrigatoria']);
  }

  return true;
};
