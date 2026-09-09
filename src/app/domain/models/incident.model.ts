export type IncidentCategory =
  | 'PNEU'
  | 'MECANICA'
  | 'ELETRICA'
  | 'ACIDENTE'
  | 'ATRASO'
  | 'OUTRO';

export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface Incident {
  id: string;
  driverId?: string;
  driverName?: string;
  driverCnh?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleBrand?: string;
  tripId?: string;
  tripRoute?: string;
  category: IncidentCategory;
  description: string;
  status: IncidentStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface GetIncidentsQuery {
  status?: string;
  tripId?: string;
}
