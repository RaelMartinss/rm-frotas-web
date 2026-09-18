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

export interface GetEfficiencyReportParams {
  startDate?: string;
  endDate?: string;
  vehicleId?: string;
  fuelType?: FuelType;
  comparePreviousPeriod?: boolean;
}

export interface EfficiencyReportSummary {
  totalCost: number;
  totalLiters: number;
  fuelingCount: number;
  weightedAveragePrice: number;
}

export interface EfficiencyReportMetrics {
  averageKmPerLiter: number | null;
  distanceKm: number;
  fuelConsumed: number;
  costPerKm: number | null;
  costPer100Km: number | null;
  validCycles: number;
}

export interface EfficiencyDataQuality {
  status: 'GOOD' | 'PARTIAL' | 'INSUFFICIENT';
  totalFuelings: number;
  validCycles: number;
  insufficientVehiclesCount: number;
  message: string;
}

export interface EfficiencyVehicleItem {
  vehicleId: string;
  plate: string;
  model: string;
  brand?: string | null;
  status: string;
  totalFuelings: number;
  fullTankFuelings: number;
  validCyclesCount: number;
  averageKmPerLiter: number | null;
  totalDistanceKm: number;
  totalFuelConsumed: number;
  totalCost: number;
  costPerKm: number | null;
  hasSufficientData: boolean;
  message?: string;
}

export interface EfficiencyConsumptionEvolutionPoint {
  cycleId: string;
  date: string;
  vehicleId: string;
  vehiclePlate: string;
  kmPerLiter: number;
  distanceKm: number;
  fuelConsumed: number;
  totalCost: number;
}

export interface EfficiencyTimeSeriesPoint {
  date: string;
  value: number;
}

export interface EfficiencyFuelDistributionItem {
  fuelType: string;
  label: string;
  totalLiters: number;
  totalCost: number;
  percentage: number;
}

export interface ConsumptionCycleFueling {
  id: string;
  vehicleId: string;
  driverId?: string;
  driverName?: string;
  fueledAt: string;
  odometerAtFueling: number;
  liters: number;
  pricePerUnit: number;
  totalCost: number;
  fuelType: string;
  gasStation?: string | null;
  fullTank: boolean;
}

export interface FuelConsumptionCycle {
  id: string;
  vehicleId: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  startFuelRecordId: string;
  endFuelRecordId: string;
  startDate: string;
  endDate: string;
  startOdometer: number;
  endOdometer: number;
  distanceKm: number;
  fuelConsumed: number;
  totalCost: number;
  averagePricePerUnit: number;
  kmPerLiter: number;
  costPerKm: number;
  costPer100Km: number;
  fuelType: string;
  fullTankFuelingsCount: number;
  partialFuelingsCount: number;
  intermediateFuelings: ConsumptionCycleFueling[];
  startFueling: ConsumptionCycleFueling;
  closingFueling: ConsumptionCycleFueling;
}

export interface EfficiencyAnomaly {
  type: 'ODOMETER_INCONSISTENT' | 'ZERO_DISTANCE' | 'OUT_OF_BOUNDS_CONSUMPTION';
  vehicleId: string;
  vehiclePlate?: string;
  title: string;
  description: string;
  startRecordId?: string;
  endRecordId?: string;
  startOdometer?: number;
  endOdometer?: number;
  differenceKm?: number;
  recordedAt: string;
}

export interface PeriodComparisonItem {
  consumptionDiffPercent: number | null;
  costDiffPercent: number | null;
  priceDiffPercent: number | null;
  volumeDiffPercent: number | null;
  previousSummary: EfficiencyReportSummary;
  previousEfficiency: EfficiencyReportMetrics;
}

export interface FuelEfficiencyReportResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: EfficiencyReportSummary;
  efficiency: EfficiencyReportMetrics;
  dataQuality: EfficiencyDataQuality;
  vehicleEfficiency: EfficiencyVehicleItem[];
  consumptionEvolution: EfficiencyConsumptionEvolutionPoint[];
  costEvolution: EfficiencyTimeSeriesPoint[];
  volumeEvolution: EfficiencyTimeSeriesPoint[];
  priceEvolution: EfficiencyTimeSeriesPoint[];
  fuelDistribution: EfficiencyFuelDistributionItem[];
  consumptionCycles: FuelConsumptionCycle[];
  anomalies: EfficiencyAnomaly[];
  comparison?: PeriodComparisonItem | null;
}

