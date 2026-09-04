export type VehicleStatus =
  | 'AVAILABLE'
  | 'IN_USE'
  | 'IN_MAINTENANCE'
  | 'DISPONIVEL'
  | 'EM_VIAGEM'
  | 'MANUTENCAO'
  | 'INDISPONIVEL';

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  currentKm: number;
  crlvExpiration: string;
  status: VehicleStatus;
}

export interface CreateVehicleDTO {
  plate: string;
  brand: string;
  model: string;
  year: number;
  currentKm: number;
  crlvExpiration: string;
}
