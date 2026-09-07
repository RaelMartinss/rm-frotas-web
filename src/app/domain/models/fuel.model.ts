export type FuelType =
  | 'GASOLINA'
  | 'ETANOL'
  | 'DIESEL'
  | 'DIESEL_S10'
  | 'GNV'
  | 'ELETRICO';

export interface FuelRecord {
  id: string;
  vehicleId: string;
  driverId: string;
  ownerId: string;
  fuelType: FuelType;
  liters: number;
  pricePerUnit: number;
  totalCost: number;
  odometerAtFueling: number;
  gasStation?: string | null;
  fullTank: boolean;
  receiptUrl?: string | null;
  fueledAt: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle?: {
    id: string;
    plate: string;
    model: string;
    brand?: string | null;
  };
  driver?: {
    id: string;
    name: string;
    cpf: string;
  };
}

export interface CreateFuelRecordParams {
  vehicleId: string;
  driverId?: string;
  fuelType: FuelType;
  liters: number;
  pricePerUnit?: number;
  totalCost?: number;
  odometerAtFueling: number;
  gasStation?: string;
  fullTank?: boolean;
  receiptUrl?: string;
  fueledAt?: string;
  notes?: string;
}

export interface UpdateFuelRecordParams {
  fuelType?: FuelType;
  liters?: number;
  pricePerUnit?: number;
  totalCost?: number;
  gasStation?: string;
  fullTank?: boolean;
  receiptUrl?: string;
  fueledAt?: string;
  notes?: string;
}

export interface FuelFilterParams {
  vehicleId?: string;
  driverId?: string;
  fuelType?: FuelType;
  fullTank?: boolean;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FuelStats {
  totalCost: number;
  totalLiters: number;
  totalRecords: number;
  averagePricePerLiter: number;
  costByFuelType: {
    fuelType: FuelType;
    totalCost: number;
    totalLiters: number;
  }[];
}

export interface ConsumptionSegment {
  startDate: string;
  endDate: string;
  startOdometer: number;
  endOdometer: number;
  distanceKm: number;
  litersConsumed: number;
  kmPerLiter: number;
  totalCost: number;
}

export interface VehicleConsumptionReport {
  vehicleId: string;
  plate: string;
  model: string;
  brand?: string | null;
  totalFuelings: number;
  fullTankFuelings: number;
  totalDistanceKm: number;
  totalLiters: number;
  totalCost: number;
  averageKmPerLiter: number | null;
  segments: ConsumptionSegment[];
}

export interface FuelConsumptionReport {
  vehicles: VehicleConsumptionReport[];
  fleetAverageKmPerLiter: number | null;
  fleetTotalDistanceKm: number;
  fleetTotalLiters: number;
  fleetTotalCost: number;
}

export interface PaginatedFuelResult {
  data: FuelRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
