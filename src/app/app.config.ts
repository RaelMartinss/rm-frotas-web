import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { tokenInterceptor } from './core/interceptors/token.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { IAuthRepository } from './domain/repositories/auth.repository.interface';
import { HttpAuthRepository } from './core/adapters/http-auth.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        tokenInterceptor,
        errorInterceptor
      ])
    ),
    { provide: IAuthRepository, useClass: HttpAuthRepository }
  ]
};
