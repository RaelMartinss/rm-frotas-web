import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IAuthRepository } from '../../../domain/repositories/auth.repository.interface';
import { ToastService } from '../../../core/services/toast.service';
import {
  LucideLock,
  LucideKeyRound,
  LucideShieldCheck,
  LucideLoader2,
  LucideLogOut,
  LucideAlertCircle,
  LucideCheck,
} from '@lucide/angular';

@Component({
  selector: 'app-change-password-mandatory',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideLock,
    LucideKeyRound,
    LucideShieldCheck,
    LucideLoader2,
    LucideLogOut,
    LucideAlertCircle,
    LucideCheck,
  ],
  templateUrl: './change-password-mandatory.html',
})
export class ChangePasswordMandatoryComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authRepository = inject(IAuthRepository);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  isSaving = signal(false);
  errorMessage = signal<string | null>(null);

  form: FormGroup = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator }
  );

  private passwordMatchValidator(g: FormGroup) {
    const newPass = g.get('newPassword')?.value;
    const confirmPass = g.get('confirmPassword')?.value;
    return newPass === confirmPass ? null : { mismatch: true };
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.errors?.['mismatch']) {
        this.errorMessage.set('As senhas digitadas não coincidem.');
      } else {
        this.errorMessage.set('Preencha todos os campos obrigatórios.');
      }
      return;
    }

    this.isSaving.set(true);
    const { currentPassword, newPassword } = this.form.value;

    this.authRepository
      .changePassword({ currentPassword, newPassword })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.toastService.success('Senha redefinida com sucesso! Bem-vindo.');
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isSaving.set(false);
          let reason = 'Erro ao redefinir a senha. Verifique sua senha atual.';
          if (err.error?.message) {
            reason = Array.isArray(err.error.message)
              ? err.error.message.join(', ')
              : err.error.message;
          }
          this.errorMessage.set(reason);
          this.toastService.error(reason);
        },
      });
  }

  logout(): void {
    this.authRepository.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
