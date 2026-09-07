export type UserRole = 'FLEET_MANAGER' | 'DRIVER' | 'ADMIN' | 'OPERATOR' | 'MANAGER';

export const USER_ROLE_LABELS: Record<string, string> = {
  FLEET_MANAGER: 'Gestor de Frota',
  DRIVER: 'Motorista',
  ADMIN: 'Administrador',
  OPERATOR: 'Operador',
  MANAGER: 'Gerente',
};

export function formatUserRole(role?: string | null): string {
  if (!role) return 'Gestor de Frota';
  return USER_ROLE_LABELS[role] || role;
}

export interface UserProps {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
    this.status = props.status ?? (props.isActive === false ? 'INACTIVE' : 'ACTIVE');
    this.isActive = props.isActive ?? (this.status === 'ACTIVE');
    this.mustChangePassword = props.mustChangePassword;
    this.avatarUrl = props.avatarUrl;
    this.createdAt = props.createdAt;
  }
}
