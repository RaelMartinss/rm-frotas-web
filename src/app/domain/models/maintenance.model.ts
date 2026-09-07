export type MaintenanceType = 'PREVENTIVA' | 'CORRETIVA';
export type MaintenanceStatus = 'AGENDADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

export interface MaintenanceItem {
  id?: string;
  name: string;
  cost: number;
  quantity?: number;
  total?: number;
}

export interface MaintenanceVehicleSummary {
  id: string;
  plate: string;
  model: string;
  brand: string | null;
  currentKm: number;
}

export interface Maintenance {
  id: string;
  vehicleId: string;
  ownerId: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  description: string;
  serviceProvider?: string | null;
  scheduledDate?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  odometerAtService?: number | null;
  cost: number;
  items?: MaintenanceItem[];
  createdAt: string;
  updatedAt: string;
  vehicle?: MaintenanceVehicleSummary;
}

export interface MaintenanceStats {
  totalCost: number;
  totalMaintenances: number;
  scheduledCount: number;
  inProgressCount: number;
  completedCount: number;
  canceledCount: number;
  preventiveCost: number;
  correctiveCost: number;
}

export interface CreateMaintenanceRequest {
  vehicleId: string;
  type?: MaintenanceType;
  description: string;
  serviceProvider?: string;
  scheduledDate?: string;
  items?: { name: string; cost: number; quantity?: number }[];
}

export interface StartMaintenanceRequest {
  vehicleId?: string;
  type?: MaintenanceType;
  description?: string;
  serviceProvider?: string;
  startedAt?: string;
}

export interface FinishMaintenanceRequest {
  odometerAtService: number;
  finishedAt?: string;
  items?: { name: string; cost: number; quantity?: number }[];
  cost?: number;
}

export interface UpdateMaintenanceRequest {
  description?: string;
  serviceProvider?: string;
  scheduledDate?: string;
  type?: MaintenanceType;
  cost?: number;
  items?: { name: string; cost: number; quantity?: number }[];
}

export interface ListMaintenancesFilter {
  vehicleId?: string;
  status?: MaintenanceStatus | 'ALL';
  type?: MaintenanceType | 'ALL';
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedMaintenanceResult {
  data: Maintenance[];
  total: number;
  page: number;
  limit: number;
}
