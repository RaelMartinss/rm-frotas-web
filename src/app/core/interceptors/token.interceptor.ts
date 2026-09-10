import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStateService } from '../services/auth-state.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  // Ignora APIs externas (ex: GitHub, ViaCEP, etc.) para não enviar tokens de login nem causar erros de CORS
  if (req.url.startsWith('http') && !req.url.includes('/api') && !req.url.includes(location?.hostname)) {
    return next(req);
  }

  const authState = inject(AuthStateService);
  const token = authState.getToken();

  const authReq = req.clone({
    withCredentials: true,
    ...(token ? { setHeaders: { Authorization: `Bearer ${token}` } } : {}),
  });

  return next(authReq);
};

