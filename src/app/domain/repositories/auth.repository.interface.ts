import { Observable } from 'rxjs';
import { User } from '../models/user.model';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export abstract class IAuthRepository {
  abstract login(credentials: LoginCredentials): Observable<AuthResponse>;
  abstract logout(): Observable<void>;
  abstract getCurrentUser(): Observable<User | null>;
}
