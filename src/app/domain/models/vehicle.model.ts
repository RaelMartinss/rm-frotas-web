export type VehicleStatus = 'DISPONIVEL' | 'EM_VIAGEM' | 'MANUTENCAO' | 'INDISPONIVEL';

export interface Vehicle {
  id: string;
  plate: string;          // Ex: "ABC-1234"
  brand: string;          // Ex: "Toyota"
  model: string;          // Ex: "Corolla"
  year: number;           // Ex: 2024
  status: VehicleStatus;
  mileage: number;        // Quilometragem atual
  crlvExpiration: string; // Data de vencimento do CRLV
}

export interface CreateVehicleDTO {
  plate: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  crlvExpiration: string;
}
