import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { IAuthRepository } from './domain/repositories/auth.repository.interface';
import { HttpAuthRepository } from './core/adapters/http-auth.repository';
import { tokenInterceptor } from './core/interceptors/token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([tokenInterceptor])
    ),
    { provide: IAuthRepository, useClass: HttpAuthRepository }
  ]
};
