import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStateService } from '../services/auth-state.service';
import { environment } from '../../../environments/environment';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  // Ignora chamadas para APIs de terceiros (ex: GitHub, ViaCEP, etc.)
  const isExternalApi =
    req.url.startsWith('http') &&
    !req.url.startsWith(environment.apiUrl) &&
    !req.url.includes('rm-frotas-api.onrender.com') &&
    !req.url.includes('localhost:3000');

  if (isExternalApi) {
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

