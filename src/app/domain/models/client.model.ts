export type ClientStatus = 'ATIVO' | 'SUSPENSO' | 'CANCELADO';

export interface ClientAddress {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface Client {
  id: string;
  legalName: string;
  tradeName: string;
  document: string;
  billingEmail: string;
  status: ClientStatus;
  address?: ClientAddress | null;
  createdAt: string;
  updatedAt?: string;
}

export interface OnboardClientDTO {
  legalName: string;
  tradeName: string;
  document: string;
  billingEmail: string;
  address?: ClientAddress;
  fleetManagerName: string;
  fleetManagerEmail: string;
}

export interface OnboardClientResponse {
  client: Client;
  fleetManager: {
    id: string;
    name: string;
    email: string;
    role: string;
    temporaryPassword: string;
  };
}

export interface UpdateClientDTO {
  legalName?: string;
  tradeName?: string;
  billingEmail?: string;
  address?: ClientAddress;
}

export interface ListClientsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface ListClientsResponse {
  clients: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
