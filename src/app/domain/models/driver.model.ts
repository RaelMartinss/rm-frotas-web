export type CnhCategory = 'A' | 'B' | 'C' | 'D' | 'E' | 'AB' | 'AC' | 'AD' | 'AE';
export type DriverStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'DISPONIVEL'
  | 'EM_VIAGEM'
  | 'FOLGA'
  | 'AFASTADO';

export type SuspensionReasonCategory =
  | 'CNH_VENCIDA'
  | 'ACIDENTE'
  | 'PROCESSO_DISCIPLINAR'
  | 'EXAME_TOXICOLOGICO_PENDENTE'
  | 'DOCUMENTACAO_IRREGULAR'
  | 'OUTRO';

export type SuspensionStatus = 'ATIVA' | 'ENCERRADA';

export const SUSPENSION_REASON_LABELS: Record<SuspensionReasonCategory, string> = {
  CNH_VENCIDA: 'CNH Vencida',
  ACIDENTE: 'Envolvimento em Acidente',
  PROCESSO_DISCIPLINAR: 'Processo Disciplinar',
  EXAME_TOXICOLOGICO_PENDENTE: 'Exame Toxicológico Pendente',
  DOCUMENTACAO_IRREGULAR: 'Documentação Irregular',
  OUTRO: 'Outro Motivo',
};

export function formatSuspensionReason(category?: string | null): string {
  if (!category) return '-';
  return (SUSPENSION_REASON_LABELS as any)[category] || category;
}

export interface DriverSuspension {
  id: string;
  driverId: string;
  ownerId: string;
  reasonCategory: SuspensionReasonCategory;
  reasonDetails?: string | null;
  suspendedBy: string;
  suspendedAt: string;
  expectedReturnDate?: string | null;
  indefinite: boolean;
  attachmentUrl?: string | null;
  liftedAt?: string | null;
  liftedBy?: string | null;
  liftReason?: string | null;
  status: SuspensionStatus;
  createdAt: string;
  updatedAt: string;
  driverName?: string;
  driverCpf?: string;
}

export interface SuspendDriverDTO {
  reasonCategory: SuspensionReasonCategory;
  reasonDetails?: string;
  expectedReturnDate?: string | null;
  indefinite?: boolean;
  attachmentUrl?: string;
}

export interface LiftSuspensionDTO {
  liftReason?: string;
}

export interface DriverCnh {
  number: string;
  category: CnhCategory;
  expirationDate: string;
  isExpired?: boolean;
}

export interface Driver {
  id: string;
  name: string;
  email?: string;
  cpf: string;
  phone?: string;
  cnhNumber?: string;
  cnhCategory?: CnhCategory;
  cnhExpiration?: string;
  cnh?: DriverCnh;
  status: DriverStatus;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDriverDTO {
  name: string;
  email: string;
  cpf: string;
  phone?: string;
  cnhNumber: string;
  cnhCategory: CnhCategory;
  cnhExpirationDate: string;
  cnhExpiration?: string;
}

export interface CreateDriverResponse {
  id: string;
  name: string;
  cpf: string;
  cnh: DriverCnh;
  status: DriverStatus;
  temporaryPassword?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface ResetDriverPasswordResponse {
  message: string;
  driverId: string;
  driverName: string;
  temporaryPassword: string;
}
