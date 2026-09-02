import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./presentation/auth/login/login').then((m) => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./presentation/layout/main-layout').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./presentation/dashboard/dashboard').then((m) => m.DashboardComponent)
      },
      {
        path: 'veiculos',
        loadComponent: () =>
          import('./presentation/vehicles/vehicle-list').then((m) => m.VehicleListComponent)
      },
      {
        path: 'motoristas',
        loadComponent: () =>
          import('./presentation/drivers/driver-list').then((m) => m.DriverListComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
