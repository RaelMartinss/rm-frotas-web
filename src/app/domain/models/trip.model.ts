import { Vehicle } from './vehicle.model';
import { Driver } from './driver.model';

export type TripStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PROGRAMADA'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDA'
  | 'CANCELADA';

export interface TripAvailability {
  vehicles: Vehicle[];
  drivers: Driver[];
}

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
  scheduledDate?: string;
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
  scheduledDate?: string;
}

export interface CreateFuelSupplyDTO {
  tripId: string;
  liters: number;
  totalValue: number;
  fuelType: 'DIESEL' | 'GASOLINA' | 'ETANOL';
  odometer: number;
  date: string;
}

export type MovementState = 'MOVING' | 'STOPPED';

export interface TripLocationPing {
  id: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  movementState?: MovementState | null;
  matchedLatitude?: number | null;
  matchedLongitude?: number | null;
  recordedAt: string;
  createdAt?: string;
}

export interface TripRouteResponse {
  tripId: string;
  status: string;
  driverName: string;
  vehiclePlate: string;
  vehicleModel: string;
  originAddress: string;
  destinationAddress: string;
  startedAt?: string | null;
  completedAt?: string | null;
  pings: TripLocationPing[];
}

