import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, filter, switchMap, take, throwError } from 'rxjs';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';
import { AuthStateService } from '../services/auth-state.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authRepository = inject(IAuthRepository);
  const authState = inject(AuthStateService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Ignora rotas de autenticação para evitar loop infinito
      const isAuthRoute =
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/refresh') ||
        req.url.includes('/auth/register');

      if (error.status === 401 && !isAuthRoute) {
        if (!authState.isRefreshing) {
          authState.isRefreshing = true;
          authState.refreshTokenSubject.next(null);

          return authRepository.refresh().pipe(
            switchMap((authResponse) => {
              authState.isRefreshing = false;
              authState.refreshTokenSubject.next(authResponse.accessToken);

              // Reenvia a requisição original com o novo token
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${authResponse.accessToken}`,
                },
              });
              return next(retryReq);
            }),
            catchError((refreshErr) => {
              authState.isRefreshing = false;
              // Só encerra a sessão se o refresh token foi explicitamente rejeitado pelo servidor (401)
              // Falhas transitórias de conexão (status 0) ou sobrecarga (status 429) não deslogam o usuário
              if (refreshErr?.status === 401) {
                authState.clear();
                router.navigate(['/login']);
              }
              return throwError(() => refreshErr);
            })

          );
        } else {
          // Já existe um refresh em andamento: aguarda a conclusão e reenvia
          return authState.refreshTokenSubject.pipe(
            filter((token) => token !== null),
            take(1),
            switchMap((token) => {
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${token}`,
                },
              });
              return next(retryReq);
            })
          );
        }
      }

      if (error.status === 403) {
        console.error('Acesso negado: você não tem permissão para realizar esta ação.');
      } else if (error.status === 500) {
        console.error('Erro interno no servidor. Tente novamente mais tarde.');
      }

      return throwError(() => error);
    })
  );
};

