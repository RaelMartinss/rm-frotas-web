import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { tokenInterceptor } from './core/interceptors/token.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { IAuthRepository } from './domain/repositories/auth.repository.interface';
import { HttpAuthRepository } from './core/adapters/http-auth.repository';
import { IDashboardRepository } from './domain/repositories/dashboard.repository.interface';
import { HttpDashboardRepository } from './core/adapters/http-dashboard.repository';
import { IVehicleRepository } from './domain/repositories/vehicle.repository.interface';
import { HttpVehicleRepository } from './core/adapters/http-vehicle.repository';

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
    { provide: IAuthRepository, useClass: HttpAuthRepository },
    { provide: IDashboardRepository, useClass: HttpDashboardRepository },
    { provide: IVehicleRepository, useClass: HttpVehicleRepository }
  ]
};
