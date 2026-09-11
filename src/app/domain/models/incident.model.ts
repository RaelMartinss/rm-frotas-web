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
  protocol?: string;
  driverId?: string;
  driverName?: string;
  driverCnh?: string;
  driverPhone?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleBrand?: string;
  vehicleKm?: number;
  tripId?: string;
  tripRoute?: string;
  category: IncidentCategory;
  description: string;
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  photoUrl?: string;
  photos?: string[];
  checklist?: any;
  status: IncidentStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface GetIncidentsQuery {
  status?: string;
  tripId?: string;
}
