import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { mustChangePasswordGuard } from './core/guards/must-change-password.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';

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
    path: 'trocar-senha-obrigatoria',
    canActivate: [mustChangePasswordGuard],
    loadComponent: () =>
      import('./presentation/auth/change-password-mandatory/change-password-mandatory').then(
        (m) => m.ChangePasswordMandatoryComponent
      )
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./presentation/layout/main-layout').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: 'clientes',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/clients/client-list/client-list').then(
            (m) => m.ClientListComponent
          )
      },
      {
        path: 'clients',
        redirectTo: 'clientes',
        pathMatch: 'full'
      },
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
      },
      {
        path: 'viagens',
        loadComponent: () =>
          import('./presentation/trips/trip-list').then((m) => m.TripListComponent)
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./presentation/profile/profile').then((m) => m.ProfileComponent)
      },
      {
        path: 'profile',
        redirectTo: 'perfil',
        pathMatch: 'full'
      },
      {
        path: 'vehicles',
        redirectTo: 'veiculos',
        pathMatch: 'full'
      },
      {
        path: 'drivers',
        redirectTo: 'motoristas',
        pathMatch: 'full'
      },
      {
        path: 'trips',
        redirectTo: 'viagens',
        pathMatch: 'full'
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/users/user-list/user-list').then((m) => m.UserListComponent)
      },
      {
        path: 'users',
        redirectTo: 'usuarios',
        pathMatch: 'full'
      },
      {
        path: 'expiracoes',
        loadComponent: () =>
          import('./presentation/expirations/expirations').then((m) => m.ExpirationsComponent)
      },
      {
        path: 'expirations',
        redirectTo: 'expiracoes',
        pathMatch: 'full'
      },
      {
        path: 'alertas',
        loadComponent: () =>
          import('./presentation/alerts/alerts').then((m) => m.AlertsComponent)
      },
      {
        path: 'alerts',
        redirectTo: 'alertas',
        pathMatch: 'full'
      },
      {
        path: 'abastecimentos',
        loadComponent: () =>
          import('./presentation/fuel/fuel-list').then(
            (m) => m.FuelListComponent
          )
      },
      {
        path: 'fuel',
        redirectTo: 'abastecimentos',
        pathMatch: 'full'
      },
      {
        path: 'manutencoes',
        loadComponent: () =>
          import('./presentation/maintenance/maintenance-list').then(
            (m) => m.MaintenanceListComponent
          )
      },
      {
        path: 'maintenances',
        redirectTo: 'manutencoes',
        pathMatch: 'full'
      },
      {
        path: 'relatorios',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'configuracoes',
        redirectTo: 'perfil',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
