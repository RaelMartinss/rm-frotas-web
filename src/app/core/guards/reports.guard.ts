import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';

export const reportsGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  const user = authState.getUser();
  if (!user) {
    return router.createUrlTree(['/login']);
  }

  if (user.role === 'DRIVER') {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
