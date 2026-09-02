export type TripStatus = 'PROGRAMADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

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
  vehiclePlate: string;
  driverId: string;
  driverName: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  status: TripStatus;
  initialOdometer: number;
  finalOdometer?: number;
  fuelSupplies: FuelSupply[];
}

export interface CreateTripDTO {
  vehicleId: string;
  driverId: string;
  origin: string;
  destination: string;
  departureDate: string;
  initialOdometer: number;
}

export interface CreateFuelSupplyDTO {
  tripId: string;
  liters: number;
  totalValue: number;
  fuelType: 'DIESEL' | 'GASOLINA' | 'ETANOL';
  odometer: number;
  date: string;
}
