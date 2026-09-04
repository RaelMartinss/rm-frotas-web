import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IAuthRepository } from '../../../domain/repositories/auth.repository.interface';
import {
  LucideMail,
  LucideLock,
  LucideEye,
  LucideEyeOff,
  LucideShieldCheck,
  LucideLoader2
} from '@lucide/angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideMail,
    LucideLock,
    LucideEye,
    LucideEyeOff,
    LucideShieldCheck,
    LucideLoader2
  ],
  templateUrl: './login.html'
})

export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authRepository = inject(IAuthRepository);
  private readonly router = inject(Router);

  // Signals para controle de UI
  isLoading = signal<boolean>(false);
  loginError = signal<string | null>(null);
  showPassword = signal<boolean>(false);
  readonly currentYear = new Date().getFullYear();

  // Reactive Form
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // Getter de conveniência para validações no HTML (f['email'], f['password'])
  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.loginError.set(null);

    this.authRepository.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.loginError.set(
          err.error?.message || 'Falha na autenticação. Verifique seu e-mail e senha.'
        );
      }
    });
  }
}
