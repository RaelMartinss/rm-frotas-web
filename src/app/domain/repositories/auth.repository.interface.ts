import { Observable } from 'rxjs';
import { User } from '../models/user.model';
import { AuthResponse, CreateUserDTO, LoginCredentials, RegisterUserDTO, UpdatePasswordDTO, UpdateProfileDTO } from '../models/auth.model';

export abstract class IAuthRepository {
  abstract login(credentials: LoginCredentials): Observable<AuthResponse>;
  abstract register(user: RegisterUserDTO): Observable<User>;
  abstract logout(): void;
  abstract getCurrentUser(): Observable<User | null>;
  abstract isAuthenticated(): boolean;
  abstract getToken(): string | null;
  abstract updateProfile(data: UpdateProfileDTO): Observable<User>;
  abstract updatePassword(data: UpdatePasswordDTO): Observable<void>;
  abstract getUsers(): Observable<User[]>;
  abstract createUser(user: CreateUserDTO): Observable<User>;
  abstract toggleUserStatus(id: string, active: boolean): Observable<User>;
}
