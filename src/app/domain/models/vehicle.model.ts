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
  renavam?: string | null;
  brand: string;
  model: string;
  year: number;
  currentKm: number;
  crlvExpiration: string;
  status: VehicleStatus;
}

export interface CreateVehicleDTO {
  plate: string;
  renavam?: string;
  brand: string;
  model: string;
  year: number;
  currentKm: number;
  crlvExpiration: string;
}

export interface CsvRowError {
  linha: number;
  placa?: string;
  motivo: string;
}

export interface VehicleImportResult {
  totalLinhas: number;
  importadosComSucesso: number;
  erros: CsvRowError[];
}

