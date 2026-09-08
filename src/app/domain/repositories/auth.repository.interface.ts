import { Observable } from 'rxjs';
import { User } from '../models/user.model';
import {
  AuthResponse,
  ChangePasswordDTO,
  CreateUserDTO,
  CreateUserResponse,
  LoginCredentials,
  RegisterUserDTO,
  ResetUserPasswordResponse,
  UpdatePasswordDTO,
  UpdateProfileDTO,
} from '../models/auth.model';

export abstract class IAuthRepository {
  abstract login(credentials: LoginCredentials): Observable<AuthResponse>;
  abstract refresh(): Observable<AuthResponse>;
  abstract register(user: RegisterUserDTO): Observable<User>;
  abstract logout(): Observable<void>;
  abstract getCurrentUser(): Observable<User | null>;
  abstract isAuthenticated(): boolean;
  abstract getToken(): string | null;
  abstract updateProfile(data: UpdateProfileDTO): Observable<User>;
  abstract updatePassword(data: UpdatePasswordDTO): Observable<void>;
  abstract changePassword(data: ChangePasswordDTO): Observable<void>;
  abstract getUsers(clientId?: string): Observable<User[]>;
  abstract createUser(user: CreateUserDTO): Observable<CreateUserResponse>;
  abstract resetUserPassword(id: string): Observable<ResetUserPasswordResponse>;
  abstract toggleUserStatus(id: string, active: boolean): Observable<User>;
}

