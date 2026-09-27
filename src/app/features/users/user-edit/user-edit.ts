import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IAuthRepository } from '../../../domain/repositories/auth.repository.interface';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { ToastService } from '../../../core/services/toast.service';
import { ImpersonationService } from '../../../core/services/impersonation.service';
import { User, UserRole, formatUserRole } from '../../../domain/models/auth.model';
import {
  LucideArrowLeft,
  LucideSave,
  LucideUser,
  LucideMail,
  LucideBriefcase,
  LucideBuilding2,
  LucideKeyRound,
  LucideCopy,
  LucideCheck,
  LucideShieldCheck,
  LucideBan,
  LucideUserCheck,
  LucideLoader2,
  LucideChevronDown,
} from '@lucide/angular';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    LucideArrowLeft,
    LucideSave,
    LucideUser,
    LucideMail,
    LucideBriefcase,
    LucideBuilding2,
    LucideKeyRound,
    LucideCopy,
    LucideCheck,
    LucideShieldCheck,
    LucideBan,
    LucideUserCheck,
    LucideLoader2,
    LucideChevronDown,
  ],
  templateUrl: './user-edit.html',
})
export class UserEditComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authRepository = inject(IAuthRepository);
  private readonly authState = inject(AuthStateService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  protected readonly impersonationService = inject(ImpersonationService);

  readonly formatUserRole = formatUserRole;
  currentUser = this.authState.currentUser;

  userId = signal<string | null>(null);
  isEditMode = computed(() => !!this.userId());
  loading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isResetting = signal<boolean>(false);
  isChangingStatus = signal<boolean>(false);

  user = signal<User | null>(null);

  // Ações Rápidas State
  resetPasswordOpen = signal<boolean>(false);
  suspendConfirmOpen = signal<boolean>(false);
  tempPasswordData = signal<{ temporaryPassword: string } | null>(null);
  copied = signal<boolean>(false);

  // Formulário Principal
  userForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    cargo: ['Gerente Operacional de Frota', [Validators.required]],
    setor: ['Setor Operacional', [Validators.required]],
    role: ['FLEET_MANAGER' as UserRole, [Validators.required]],

    // Escopo de Permissões de Módulos (RBAC)
    permVehicles: [true],
    permTrips: [true],
    permMaintenance: [true],
    permDrivers: [true],
    permFuel: [true],
    permUsers: [false],
  });

  // Roles disponíveis de acordo com o usuário logado
  availableRoles = computed<{ value: UserRole; label: string; desc: string }[]>(() => {
    const currentRole = this.currentUser()?.role;
    if (currentRole === 'SUPER_ADMIN') {
      return [
        { value: 'SUPER_ADMIN', label: 'Admin Master', desc: 'Acesso total e irrestrito a todos os módulos e clientes' },
        { value: 'FLEET_MANAGER', label: 'Gestor de Frota', desc: 'Gestão completa da operação, motoristas, veículos e custos' },
        { value: 'ADMIN', label: 'Operador de Tráfego', desc: 'Despacho de viagens, rotas diárias e controle de frota' },
      ];
    }
    return [
      { value: 'FLEET_MANAGER', label: 'Gestor de Frota', desc: 'Gestão completa da operação e veículos' },
      { value: 'ADMIN', label: 'Operador de Tráfego', desc: 'Despacho de viagens e rotas' },
    ];
  });

  get initials(): string {
    const name = this.userForm.get('name')?.value || this.user()?.name || '';
    if (!name) return 'US';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'novo') {
      this.userId.set(id);
      this.loadUser(id);
    } else {
      // Modo Criação
      const defaultRole = this.availableRoles()[0]?.value ?? 'FLEET_MANAGER';
      this.userForm.patchValue({
        role: defaultRole,
        permUsers: defaultRole === 'SUPER_ADMIN' || defaultRole === 'FLEET_MANAGER',
      });
    }

    // Ao mudar o Perfil RBAC, atualiza as permissões padrão sugeridas
    this.userForm.get('role')?.valueChanges.subscribe((role: UserRole) => {
      if (role === 'SUPER_ADMIN' || role === 'FLEET_MANAGER') {
        this.userForm.patchValue({ permUsers: true }, { emitEvent: false });
      } else {
        this.userForm.patchValue({ permUsers: false }, { emitEvent: false });
      }
    });
  }

  loadUser(id: string): void {
    this.loading.set(true);
    this.authRepository.getUserById(id).subscribe({
      next: (userData) => {
        this.user.set(userData);
        this.loading.set(false);

        // Preenche o formulário
        let cargoDefault = 'Gerente Operacional de Frota';
        if (userData.role === 'SUPER_ADMIN') cargoDefault = 'Diretor de Tecnologia & Frota';
        else if (userData.role === 'ADMIN') cargoDefault = 'Supervisor de Logística & Tráfego';

        this.userForm.patchValue({
          name: userData.name,
          email: userData.email,
          role: userData.role,
          cargo: cargoDefault,
          setor: 'Setor Operacional',
          permVehicles: true,
          permTrips: true,
          permMaintenance: true,
          permDrivers: true,
          permFuel: true,
          permUsers: userData.role === 'SUPER_ADMIN' || userData.role === 'FLEET_MANAGER',
        });
      },
      error: () => {
        this.loading.set(false);
        this.toastService.error('Erro ao carregar dados do usuário.');
        this.router.navigate(['/usuarios']);
      },
    });
  }

  save(): void {
    if (this.impersonationService.isReadOnly()) return;

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.toastService.error('Preencha os campos obrigatórios corretamente.');
      return;
    }

    const formVal = this.userForm.value;
    this.isSaving.set(true);

    if (this.isEditMode()) {
      // Atualização
      const id = this.userId()!;
      this.authRepository.updateUser(id, {
        name: formVal.name,
        role: formVal.role,
      }).subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.user.set(updated);
          this.toastService.success('Usuário atualizado com sucesso!');
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err.error?.message || 'Erro ao atualizar usuário.';
          this.toastService.error(msg);
        },
      });
    } else {
      // Criação
      this.authRepository.createUser({
        name: formVal.name,
        email: formVal.email,
        role: formVal.role,
      }).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.toastService.success('Novo usuário cadastrado com sucesso!');
          if (res.temporaryPassword) {
            this.tempPasswordData.set({ temporaryPassword: res.temporaryPassword });
          } else {
            this.router.navigate(['/usuarios']);
          }
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err.error?.message || 'Erro ao cadastrar usuário.';
          this.toastService.error(msg);
        },
      });
    }
  }

  // AÇÕES RÁPIDAS
  triggerResetPassword(): void {
    if (this.impersonationService.isReadOnly()) return;
    const u = this.user();
    if (!u) return;

    this.isResetting.set(true);
    this.authRepository.resetUserPassword(u.id).subscribe({
      next: (res) => {
        this.isResetting.set(false);
        this.tempPasswordData.set({ temporaryPassword: res.temporaryPassword });
        this.toastService.success('Senha temporária gerada com sucesso.');
      },
      error: () => {
        this.isResetting.set(false);
        this.toastService.error('Erro ao resetar senha do usuário.');
      },
    });
  }

  copyTempPassword(): void {
    const pwd = this.tempPasswordData()?.temporaryPassword;
    if (pwd) {
      navigator.clipboard.writeText(pwd).then(() => {
        this.copied.set(true);
        this.toastService.success('Senha copiada para a área de transferência!');
        setTimeout(() => this.copied.set(false), 3000);
      });
    }
  }

  toggleUserStatus(): void {
    if (this.impersonationService.isReadOnly()) return;
    const u = this.user();
    if (!u) return;

    if (u.id === this.currentUser()?.id) {
      this.toastService.warning('Você não pode suspender o seu próprio usuário.');
      return;
    }

    const newStatus = !u.isActive;
    this.isChangingStatus.set(true);
    this.authRepository.toggleUserStatus(u.id, newStatus).subscribe({
      next: (updated) => {
        this.isChangingStatus.set(false);
        this.user.set(updated);
        this.suspendConfirmOpen.set(false);
        this.toastService.success(
          updated.isActive ? 'Acesso do usuário reativado!' : 'Acesso do usuário suspenso.'
        );
      },
      error: () => {
        this.isChangingStatus.set(false);
        this.toastService.error('Erro ao alterar status do usuário.');
      },
    });
  }
}
