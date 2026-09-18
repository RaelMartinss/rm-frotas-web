import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, filter, switchMap, take, throwError } from 'rxjs';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';
import { AuthStateService } from '../services/auth-state.service';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authRepository = inject(IAuthRepository);
  const authState = inject(AuthStateService);
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const hasImpersonationToken = !!sessionStorage.getItem('rm_frotas_impersonation_token');

      // Se ocorrer 401 durante modo suporte, apenas encerra o suporte e volta para clientes
      if (error.status === 401 && hasImpersonationToken) {
        try {
          sessionStorage.removeItem('rm_frotas_impersonation_token');
          sessionStorage.removeItem('rm_frotas_impersonation_session');
        } catch {}
        toastService.warning('Sessão de suporte expirada ou finalizada.');
        router.navigate(['/clientes']);
        return throwError(() => error);
      }

      // Se ocorrer 403 durante modo suporte (tentativa de escrita em modo READ_ONLY)
      if (error.status === 403 && hasImpersonationToken) {
        toastService.warning('Modo Suporte: Modificações não são permitidas (somente leitura).');
        return throwError(() => error);
      }

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
                const wasSuperAdmin = authState.getUser()?.role === 'SUPER_ADMIN';
                authState.clear();
                toastService.warning('Sua sessão expirou. Por favor, faça login novamente.');
                router.navigate([wasSuperAdmin ? '/admin-login' : '/login']);
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
        if (req.url.includes('/clients') && authState.getUser()?.role !== 'SUPER_ADMIN') {
          authState.clear();
          router.navigate(['/admin-login']);
        }
      }

      let handledError = error;
      const isInternalServerError =
        error.status === 500 ||
        error.error?.message === 'Internal server error' ||
        (typeof error.error === 'string' && error.error.toLowerCase().includes('internal server error'));

      if (isInternalServerError) {
        console.error('Erro interno no servidor. Tente novamente mais tarde.');
        const sanitizedBody =
          typeof error.error === 'object' && error.error !== null
            ? { ...error.error, message: 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.' }
            : { message: 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.' };

        handledError = new HttpErrorResponse({
          error: sanitizedBody,
          headers: error.headers,
          status: error.status,
          statusText: error.statusText,
          url: error.url ?? undefined,
        });
      }

      return throwError(() => handledError);
    })
  );
};

