import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authRepository = inject(IAuthRepository);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token expirou ou é inválido: limpa a sessão e redireciona para o login
        authRepository.logout();
        router.navigate(['/auth/login'], {
          queryParams: { expired: 'true' }
        });
      } else if (error.status === 403) {
        console.error('Acesso negado: você não tem permissão para realizar esta ação.');
      } else if (error.status === 500) {
        console.error('Erro interno no servidor NestJS. Tente novamente mais tarde.');
      }

      return throwError(() => error);
    })
  );
};
