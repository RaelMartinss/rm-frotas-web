export type CnhCategory = 'A' | 'B' | 'C' | 'D' | 'E' | 'AB' | 'AC' | 'AD' | 'AE';
export type DriverStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'DISPONIVEL'
  | 'EM_VIAGEM'
  | 'FOLGA'
  | 'AFASTADO';

export interface DriverCnh {
  number: string;
  category: CnhCategory;
  expirationDate: string;
  isExpired?: boolean;
}

export interface Driver {
  id: string;
  name: string;
  cpf: string;
  phone?: string;
  cnhNumber?: string;
  cnhCategory?: CnhCategory;
  cnhExpiration?: string;
  cnh?: DriverCnh;
  status: DriverStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDriverDTO {
  name: string;
  cpf: string;
  phone?: string;
  cnhNumber: string;
  cnhCategory: CnhCategory;
  cnhExpirationDate: string;
  cnhExpiration?: string;
}
