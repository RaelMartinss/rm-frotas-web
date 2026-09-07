import { ApplicationConfig, provideZonelessChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom, of, catchError } from 'rxjs';
import { routes } from './app.routes';
import { tokenInterceptor } from './core/interceptors/token.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { IAuthRepository } from './domain/repositories/auth.repository.interface';
import { HttpAuthRepository } from './core/adapters/http-auth.repository';
import { AuthStateService } from './core/services/auth-state.service';
import { IDashboardRepository } from './domain/repositories/dashboard.repository.interface';
import { HttpDashboardRepository } from './core/adapters/http-dashboard.repository';
import { IVehicleRepository } from './domain/repositories/vehicle.repository.interface';
import { HttpVehicleRepository } from './core/adapters/http-vehicle.repository';
import { IDriverRepository } from './domain/repositories/driver.repository.interface';
import { HttpDriverRepository } from './core/adapters/http-driver.repository';
import { ITripRepository } from './domain/repositories/trip.repository.interface';
import { HttpTripRepository } from './core/adapters/http-trip.repository';
import { IMaintenanceRepository } from './domain/repositories/maintenance.repository.interface';
import { HttpMaintenanceRepository } from './core/adapters/http-maintenance.repository';

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
    { provide: IVehicleRepository, useClass: HttpVehicleRepository },
    { provide: IDriverRepository, useClass: HttpDriverRepository },
    { provide: ITripRepository, useClass: HttpTripRepository },
    { provide: IMaintenanceRepository, useClass: HttpMaintenanceRepository },
    provideAppInitializer(() => {
      const authRepository = inject(IAuthRepository);
      const authState = inject(AuthStateService);

      return firstValueFrom(
        authRepository.refresh().pipe(
          catchError(() => of(null))
        )
      ).finally(() => {
        authState.setInitialized();
      });
    })
  ]
};

