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
  LucideLoader2,
  LucideX,
  LucideCheckCircle2,
  LucideKeyRound,
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
    LucideLoader2,
    LucideX,
    LucideCheckCircle2,
    LucideKeyRound,
  ],
  templateUrl: './login.html'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authRepository = inject(IAuthRepository);
  private readonly router = inject(Router);

  // Signals para controle de UI de login
  isLoading = signal<boolean>(false);
  loginError = signal<string | null>(null);
  showPassword = signal<boolean>(false);
  readonly currentYear = new Date().getFullYear();

  // Signals para Modal "Esqueci minha senha"
  isForgotPasswordModalOpen = signal<boolean>(false);
  isForgotLoading = signal<boolean>(false);
  forgotSuccessMessage = signal<string | null>(null);
  forgotErrorMessage = signal<string | null>(null);

  // Reactive Form Login
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // Reactive Form Esqueci minha senha
  forgotForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  // Getters de conveniência para validações no HTML
  get f() {
    return this.loginForm.controls;
  }

  get forgotF() {
    return this.forgotForm.controls;
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

  openForgotPasswordModal(): void {
    this.forgotForm.reset({ email: this.loginForm.get('email')?.value || '' });
    this.forgotSuccessMessage.set(null);
    this.forgotErrorMessage.set(null);
    this.isForgotPasswordModalOpen.set(true);
  }

  closeForgotPasswordModal(): void {
    this.isForgotPasswordModalOpen.set(false);
  }

  onSubmitForgotPassword(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.isForgotLoading.set(true);
    this.forgotSuccessMessage.set(null);
    this.forgotErrorMessage.set(null);

    // Simulação com tempo de resposta natural para segurança OWASP
    setTimeout(() => {
      this.isForgotLoading.set(false);
      this.forgotSuccessMessage.set(
        `Se o e-mail (${this.forgotForm.value.email}) estiver cadastrado, você receberá um link com instruções para redefinir sua senha.`
      );
    }, 1200);
  }
}

