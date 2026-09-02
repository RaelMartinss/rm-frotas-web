import { Observable } from 'rxjs';
import { User } from '../models/user.model';
import { AuthResponse, LoginCredentials, RegisterUserDTO } from '../models/auth.model';

export abstract class IAuthRepository {
  abstract login(credentials: LoginCredentials): Observable<AuthResponse>;
  abstract register(user: RegisterUserDTO): Observable<User>;
  abstract logout(): void;
  abstract getCurrentUser(): Observable<User | null>;
  abstract isAuthenticated(): boolean;
  abstract getToken(): string | null;
}
