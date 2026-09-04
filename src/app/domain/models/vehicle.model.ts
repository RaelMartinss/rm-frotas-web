export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  currentKm: number;
  crlvExpiration: string;
  status: 'DISPONIVEL' | 'EM_VIAGEM' | 'MANUTENCAO' | 'INDISPONIVEL';
}

export interface CreateVehicleDTO {
  plate: string;
  brand: string;
  model: string;
  year: number;
  currentKm: number;
  crlvExpiration: string;
}
