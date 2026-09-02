export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'DRIVER';

export interface UserProps {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
  readonly isActive: boolean;
  readonly mustChangePassword?: boolean;
  readonly avatarUrl?: string;
  readonly createdAt?: string;

  constructor(props: UserProps) {
    this.id = props.id;
    this.name = props.name;
    this.email = props.email;
    this.role = props.role;
    this.isActive = props.isActive ?? true;
    this.mustChangePassword = props.mustChangePassword;
    this.avatarUrl = props.avatarUrl;
    this.createdAt = props.createdAt;
  }
}
