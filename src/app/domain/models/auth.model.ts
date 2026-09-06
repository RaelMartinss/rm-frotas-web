import { UserRole, User } from './user.model';

export type { UserRole, User };

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterUserDTO {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface CreateUserDTO {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

export interface UpdateProfileDTO {
  name?: string;
  email?: string;
}

export interface UpdatePasswordDTO {
  currentPassword: string;
  newPassword: string;
}
