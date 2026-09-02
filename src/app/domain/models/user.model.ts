export interface UserProps {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'DRIVER';
  avatarUrl?: string;
}

export class User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: 'ADMIN' | 'MANAGER' | 'DRIVER';
  readonly avatarUrl?: string;

  constructor(props: UserProps) {
    this.id = props.id;
    this.name = props.name;
    this.email = props.email;
    this.role = props.role;
    this.avatarUrl = props.avatarUrl;
  }
}
