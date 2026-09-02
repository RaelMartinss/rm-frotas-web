export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'DRIVER';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterUserDTO {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'MANAGER' | 'DRIVER';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

export interface UpdateProfileDTO {
  name: string;
  email: string;
}

export interface UpdatePasswordDTO {
  currentPassword: string;
  newPassword: string;
}
