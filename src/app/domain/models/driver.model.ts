export type CnhCategory = 'A' | 'B' | 'C' | 'D' | 'E' | 'AB' | 'AC' | 'AD' | 'AE';
export type DriverStatus = 'DISPONIVEL' | 'EM_VIAGEM' | 'FOLGA' | 'AFASTADO';

export interface Driver {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  cnhNumber: string;
  cnhCategory: CnhCategory;
  cnhExpiration: string; // ISO Date YYYY-MM-DD
  status: DriverStatus;
}

export interface CreateDriverDTO {
  name: string;
  cpf: string;
  phone: string;
  cnhNumber: string;
  cnhCategory: CnhCategory;
  cnhExpiration: string;
}
