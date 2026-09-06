export type UserRole = 'FLEET_MANAGER' | 'DRIVER' | 'ADMIN' | 'OPERATOR' | 'MANAGER';

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
