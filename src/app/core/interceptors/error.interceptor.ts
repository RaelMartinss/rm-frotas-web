import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Captura erros de autenticação ou autorização
      if (error.status === 401 || error.status === 403) {
        localStorage.removeItem('access_token');
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};
