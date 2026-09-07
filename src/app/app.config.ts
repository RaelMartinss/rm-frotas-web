import { ApplicationConfig, provideZonelessChangeDetection, provideAppInitializer, inject, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
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
import { IFuelRepository } from './domain/repositories/fuel.repository.interface';
import { HttpFuelRepository } from './core/adapters/http-fuel.repository';

registerLocaleData(localePt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
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
    { provide: IFuelRepository, useClass: HttpFuelRepository },
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

