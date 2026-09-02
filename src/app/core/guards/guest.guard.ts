import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const guestGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('access_token');

  if (!token) {
    return true;
  }

  // Se já tiver token, redireciona para a dashboard
  return router.createUrlTree(['/dashboard']);
};
