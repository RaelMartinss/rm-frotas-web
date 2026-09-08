export type UserRole = 'SUPER_ADMIN' | 'FLEET_MANAGER' | 'ADMIN' | 'DRIVER';

export const USER_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrador',
  FLEET_MANAGER: 'Gestor de Frota',
  ADMIN: 'Administrador',
  DRIVER: 'Motorista',
};

export function formatUserRole(role?: string | null): string {
  if (!role) return 'Usuário';
  return USER_ROLE_LABELS[role] || role;
}

export interface UserProps {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clientId?: string | null;
  clientName?: string | null;
  status?: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
  avatarUrl?: string;
  createdAt?: string;
}

export class User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly clientId?: string | null;
  readonly clientName?: string | null;
  readonly status: string;
  readonly isActive: boolean;
  readonly mustChangePassword?: boolean;
  readonly avatarUrl?: string;
  readonly createdAt?: string;

  constructor(props: UserProps) {
    this.id = props.id;
    this.name = props.name;
    this.email = props.email;
    this.role = props.role;
    this.clientId = props.clientId ?? null;
    this.clientName = props.clientName ?? null;
    this.status = props.status ?? (props.isActive === false ? 'INACTIVE' : 'ACTIVE');
    this.isActive = props.isActive ?? (this.status === 'ACTIVE');
    this.mustChangePassword = props.mustChangePassword ?? false;
    this.avatarUrl = props.avatarUrl;
    this.createdAt = props.createdAt;
  }
}
