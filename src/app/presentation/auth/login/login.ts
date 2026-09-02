import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { IAuthRepository } from '../../../domain/repositories/auth.repository.interface';
import { take } from 'rxjs';

import { LucideLock, LucideMail, LucideEye, LucideEyeOff } from '@lucide/angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideLock,
    LucideMail,
    LucideEye,
    LucideEyeOff,
],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;

  isLoading = signal(false);
  loginError = signal<string | null>(null);
  showPassword = signal(false);

  constructor(
    private readonly fb: FormBuilder,
    private readonly authRepository: IAuthRepository
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    this.loginError.set(null);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    this.authRepository
      .login(this.loginForm.value)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          localStorage.setItem('access_token', response.accessToken);
          this.isLoading.set(false);
          console.log('Login realizado com sucesso', response);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.loginError.set(
            err.error?.message || 'E-mail ou senha incorretos.'
          );
        }
      });
  }
}
