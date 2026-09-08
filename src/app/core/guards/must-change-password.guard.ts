import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';

export const mustChangePasswordGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  const user = authState.getUser();
  if (user?.mustChangePassword) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
