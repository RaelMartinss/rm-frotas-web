import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authRepository = inject(IAuthRepository);
  const token = authRepository.getToken();

  // Se o token existir, clona a requisição adicionando o header Authorization
  if (token) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedReq);
  }

  return next(req);
};
