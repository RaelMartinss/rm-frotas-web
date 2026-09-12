import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IAuthRepository } from '../../../domain/repositories/auth.repository.interface';
import { AuthStateService } from '../../../core/services/auth-state.service';
import {
  LucideMail,
  LucideLock,
  LucideEye,
  LucideEyeOff,
  LucideLoader2,
  LucideShieldAlert,
  LucideArrowRight,
  LucideAlertTriangle,
  LucideCheckCircle2,
} from '@lucide/angular';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideMail,
    LucideLock,
    LucideEye,
    LucideEyeOff,
    LucideLoader2,
    LucideShieldAlert,
    LucideArrowRight,
    LucideAlertTriangle,
    LucideCheckCircle2,
  ],
  templateUrl: './admin-login.html',
})
export class AdminLoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authRepository = inject(IAuthRepository);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal<boolean>(false);
  readonly currentYear = new Date().getFullYear();

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get f() {
    return this.loginForm.controls;
  }

  toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authRepository.adminLogin(this.loginForm.value).subscribe({
      next: (response) => {
        this.isLoading.set(false);

        // Validação adicional de consistência de perfil no frontend
        if (response.user?.role !== 'SUPER_ADMIN') {
          this.authState.clear();
          this.errorMessage.set(
            'Acesso negado: Este portal é restrito exclusivamente a Super Administradores da plataforma RM Frotas.',
          );
          return;
        }

        // Redireciona o Super Admin diretamente para a tela de Gestão de Clientes
        this.router.navigate(['/clientes']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.authState.clear();

        if (err?.status === 403) {
          this.errorMessage.set(
            err.error?.message ||
              'Acesso negado: Este portal é restrito exclusivamente a Super Administradores da plataforma.',
          );
        } else if (err?.status === 429) {
          this.errorMessage.set(
            'Muitas tentativas no portal administrativo. Aguarde 1 minuto para tentar novamente.',
          );
        } else if (err?.status === 401) {
          this.errorMessage.set('E-mail ou senha incorretos.');
        } else {
          this.errorMessage.set(
            err?.error?.message || 'Falha na autenticação administrativa. Verifique sua conexão.',
          );
        }
      },
    });
  }
}
