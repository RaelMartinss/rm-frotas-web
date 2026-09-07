import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';
import { User, formatUserRole } from '../../domain/models/auth.model';
import {
  LucideUser,
  LucideLock,
  LucideMail,
  LucideShield,
  LucideLoader2,
  LucideCheckCircle2,
  LucideAlertCircle,
  LucideEye,
  LucideEyeOff
} from '@lucide/angular';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideUser,
    LucideLock,
    LucideShield,
    LucideLoader2,
    LucideCheckCircle2,
    LucideAlertCircle,
    LucideEye,
    LucideEyeOff
  ],
  templateUrl: './profile.html'
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authRepository = inject(IAuthRepository);

  readonly formatUserRole = formatUserRole;
  currentUser = signal<User | null>(null);

  // Estados de salvamento e feedback
  isSavingProfile = signal<boolean>(false);
  isSavingPassword = signal<boolean>(false);
  profileSuccessMsg = signal<string | null>(null);
  profileErrorMsg = signal<string | null>(null);
  passwordSuccessMsg = signal<string | null>(null);
  passwordErrorMsg = signal<string | null>(null);

  // Visibilidade de senhas
  showCurrentPassword = signal<boolean>(false);
  showNewPassword = signal<boolean>(false);

  // Formulários
  profileForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]]
  });

  passwordForm: FormGroup = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.authRepository.getCurrentUser().subscribe({
      next: (user) => {
        if (user) {
          this.currentUser.set(user);
          this.profileForm.patchValue({
            name: user.name,
            email: user.email
          });
        }
      }
    });
  }

  updateProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSavingProfile.set(true);
    this.profileSuccessMsg.set(null);
    this.profileErrorMsg.set(null);

    this.authRepository.updateProfile(this.profileForm.value).subscribe({
      next: (updatedUser) => {
        this.currentUser.set(updatedUser);
        this.isSavingProfile.set(false);
        this.profileSuccessMsg.set('Dados do perfil atualizados com sucesso!');
      },
      error: (err) => {
        this.isSavingProfile.set(false);
        this.profileErrorMsg.set(err.error?.message || 'Erro ao atualizar dados do perfil.');
      }
    });
  }

  updatePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isSavingPassword.set(true);
    this.passwordSuccessMsg.set(null);
    this.passwordErrorMsg.set(null);

    this.authRepository.updatePassword(this.passwordForm.value).subscribe({
      next: () => {
        this.isSavingPassword.set(false);
        this.passwordSuccessMsg.set('Senha alterada com sucesso!');
        this.passwordForm.reset();
      },
      error: (err) => {
        this.isSavingPassword.set(false);
        this.passwordErrorMsg.set(err.error?.message || 'Erro ao alterar a senha. Verifique sua senha atual.');
      }
    });
  }
}
