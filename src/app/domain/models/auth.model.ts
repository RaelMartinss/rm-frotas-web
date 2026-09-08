import { UserRole, User, USER_ROLE_LABELS, formatUserRole } from './user.model';

export type { UserRole, User };
export { USER_ROLE_LABELS, formatUserRole };

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
  role: UserRole;
  password?: string;
}

export interface CreateUserResponse {
  user: User;
  temporaryPassword?: string;
}

export interface ResetUserPasswordResponse {
  temporaryPassword: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
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
