export interface KpiSummary {
  activeVehicles: number;
  availableVehicles: number;
  availablePercentage: number;
  inMaintenanceVehicles: number;
  inMaintenancePercentage: number;
  unavailableVehicles: number;
  unavailablePercentage: number;
}

export interface UpcomingExpiration {
  id: string;
  type: 'CNH' | 'CRLV' | 'SEGURO';
  title: string;
  subtitle: string;
  daysRemaining: number;
  expirationDate: string;
}

export interface OngoingTrip {
  id: string;
  driverName: string;
  driverInitials: string;
  vehicleName: string;
  vehiclePlate: string;
  route: string;
  startTime: string;
  status: 'EM_ANDAMENTO' | 'PROGRAMADA';
}

export interface RecentAlert {
  id: string;
  type: 'WARNING' | 'DANGER' | 'INFO';
  title: string;
  subtitle: string;
  timeAgo: string;
}

export interface WeeklyActivityDay {
  day: string;
  date: string;
  completedTrips: number;
  ongoingTrips: number;
}

export interface WeeklyActivitySummary {
  days: WeeklyActivityDay[];
  dailyAverage: number;
  totalCompleted: number;
  totalOngoing: number;
}

export interface DashboardSummary {
  kpis: KpiSummary;
  expirations: UpcomingExpiration[];
  trips: OngoingTrip[];
  alerts: RecentAlert[];
  weeklyActivity?: WeeklyActivitySummary;
}
