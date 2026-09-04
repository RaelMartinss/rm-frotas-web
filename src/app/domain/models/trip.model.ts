export type TripStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PROGRAMADA'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDA'
  | 'CANCELADA';

export interface LocationDTO {
  address: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
}

export interface FuelSupply {
  id: string;
  tripId: string;
  liters: number;
  totalValue: number;
  fuelType: 'DIESEL' | 'GASOLINA' | 'ETANOL';
  odometer: number;
  date: string;
}

export interface Trip {
  id: string;
  vehicleId: string;
  vehiclePlate?: string;
  driverId: string;
  driverName?: string;
  origin: string;
  destination: string;
  originAddress?: string;
  originCity?: string;
  originState?: string;
  destinationAddress?: string;
  destinationCity?: string;
  destinationState?: string;
  departureDate?: string;
  returnDate?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  status: TripStatus;
  initialOdometer?: number;
  finalOdometer?: number;
  fuelSupplies?: FuelSupply[];
}

export interface CreateTripDTO {
  vehicleId: string;
  driverId: string;
  origin: LocationDTO;
  destination: LocationDTO;
}

export interface CreateFuelSupplyDTO {
  tripId: string;
  liters: number;
  totalValue: number;
  fuelType: 'DIESEL' | 'GASOLINA' | 'ETANOL';
  odometer: number;
  date: string;
}

