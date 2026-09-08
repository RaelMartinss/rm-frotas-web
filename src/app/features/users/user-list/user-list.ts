import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { IAuthRepository } from '../../../domain/repositories/auth.repository.interface';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { ToastService } from '../../../core/services/toast.service';
import { User, UserRole, formatUserRole, CreateUserResponse } from '../../../domain/models/auth.model';
import {
  LucideUsers,
  LucideUserPlus,
  LucideSearch,
  LucideLoader2,
  LucideX,
  LucideCheckCircle2,
  LucideXCircle,
  LucideAlertCircle,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight,
  LucideKeyRound,
  LucideCopy,
  LucideCheck,
  LucideShieldAlert,
} from '@lucide/angular';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideUsers,
    LucideUserPlus,
    LucideSearch,
    LucideLoader2,
    LucideX,
    LucideCheckCircle2,
    LucideXCircle,
    LucideAlertCircle,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronsLeft,
    LucideChevronsRight,
    LucideKeyRound,
    LucideCopy,
    LucideCheck,
    LucideShieldAlert,
  ],
  templateUrl: './user-list.html'
})
export class UserListComponent implements OnInit {
  private readonly authRepository = inject(IAuthRepository);
  private readonly authState = inject(AuthStateService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly formatUserRole = formatUserRole;
  currentUser = this.authState.currentUser;

  users = signal<User[]>([]);
  loading = signal<boolean>(true);
  isModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Modal Senha Temporária
  tempPasswordModalOpen = signal<boolean>(false);
  tempPasswordData = signal<{ userName: string; temporaryPassword: string; title: string } | null>(null);
  copied = signal<boolean>(false);

  // Modal de Confirmação de Reset de Senha
  resetConfirmModalOpen = signal<boolean>(false);
  userToReset = signal<User | null>(null);
  isResetting = signal<boolean>(false);

  // --- PAGINAÇÃO (MÁXIMO 10 POR PÁGINA) ---
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  pageSizeOptions: number[] = [10, 25, 50];

  // Busca e Filtros Reativos
  searchControl = new FormControl('', { nonNullable: true });
  selectedRole = signal<string>('ALL');

  searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  // Available roles to create based on logged-in user role
  availableCreateRoles = computed<{ value: UserRole; label: string }[]>(() => {
    const role = this.currentUser()?.role;
    if (role === 'SUPER_ADMIN') {
      return [
        { value: 'FLEET_MANAGER', label: 'Gestor de Frota (FLEET_MANAGER)' },
        { value: 'ADMIN', label: 'Administrador (ADMIN)' },
        { value: 'DRIVER', label: 'Motorista (DRIVER)' },
      ];
    }
    // FLEET_MANAGER
    return [
      { value: 'ADMIN', label: 'Administrador da Equipe (ADMIN)' },
      { value: 'DRIVER', label: 'Motorista do Aplicativo (DRIVER)' },
    ];
  });

  // Counts computados para os chips de filtro
  totalCount = computed(() => (this.users() || []).filter(Boolean).length);
  managerCount = computed(
    () =>
      (this.users() || [])
        .filter(Boolean)
        .filter((u) => u.role === 'FLEET_MANAGER' || u.role === 'ADMIN').length
  );
  driverRoleCount = computed(
    () =>
      (this.users() || [])
        .filter(Boolean)
        .filter((u) => u.role === 'DRIVER').length
  );

  filteredUsers = computed(() => {
    const list = (this.users() || []).filter(Boolean);
    const term = this.searchTerm().toLowerCase().trim();
    const role = this.selectedRole();

    return list.filter((user) => {
      const matchesSearch =
        (user.name || '').toLowerCase().includes(term) ||
        (user.email || '').toLowerCase().includes(term);

      const matchesRole = role === 'ALL' || user.role === role;

      return matchesSearch && matchesRole;
    });
  });

  totalItems = computed(() => this.filteredUsers().length);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()) || 1);

  startIndex = computed(() => {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.totalItems());
  });

  displayedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredUsers().slice(start, start + this.pageSize());
  });

  // Gera lista de páginas com elipses
  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 1;
    const range: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) range.push(i);
      return range;
    }

    const left = Math.max(2, current - delta);
    const right = Math.min(total - 1, current + delta);

    range.push(1);
    if (left > 2) range.push('...');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < total - 1) range.push('...');
    range.push(total);

    return range;
  });

  clearSearch(): void {
    this.searchControl.setValue('');
    this.currentPage.set(1);
  }

  setRoleFilter(role: string): void {
    this.selectedRole.set(role);
    this.currentPage.set(1);
  }

  setPage(page: number | string): void {
    if (typeof page !== 'number' || page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }
    this.currentPage.set(page);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.setPage(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.setPage(this.currentPage() - 1);
    }
  }

  setPageSize(newSize: number): void {
    this.pageSize.set(newSize);
    this.currentPage.set(1);
  }

  userForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    role: ['ADMIN' as UserRole, [Validators.required]],
  });

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(1);
      });

    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.authRepository.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastService.error('Erro ao carregar lista de usuários.');
      }
    });
  }

  openModal(): void {
    this.errorMessage.set(null);
    const defaultRole = this.availableCreateRoles()[0]?.value ?? 'ADMIN';
    this.userForm.reset({
      name: '',
      email: '',
      role: defaultRole,
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.errorMessage.set(null);
  }

  saveUser(): void {
    this.errorMessage.set(null);

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.toastService.error('Por favor, preencha todos os campos obrigatórios corretamente.');
      return;
    }

    this.isSaving.set(true);
    this.authRepository.createUser(this.userForm.value).subscribe({
      next: (response) => {
        if (response?.user) {
          this.users.update((list) => [response.user, ...(list || []).filter(Boolean)]);
        }
        this.isSaving.set(false);
        this.closeModal();
        this.toastService.success('Novo usuário cadastrado com sucesso!');

        if (response.temporaryPassword) {
          this.tempPasswordData.set({
            userName: response.user?.name || this.userForm.value.name || 'Usuário',
            temporaryPassword: response.temporaryPassword,
            title: 'Usuário Criado com Sucesso',
          });
          this.tempPasswordModalOpen.set(true);
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        let reason = 'Verifique os dados informados.';
        if (err.error?.message) {
          reason = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.errorMessage.set(reason);
        this.toastService.error(`Usuário não cadastrado. Motivo: ${reason}`);
      }
    });
  }

  openResetPasswordModal(user: User): void {
    this.userToReset.set(user);
    this.resetConfirmModalOpen.set(true);
  }

  closeResetConfirmModal(): void {
    this.resetConfirmModalOpen.set(false);
    this.userToReset.set(null);
  }

  confirmResetPassword(): void {
    const user = this.userToReset();
    if (!user) return;

    this.isResetting.set(true);
    this.authRepository.resetUserPassword(user.id).subscribe({
      next: (res) => {
        this.isResetting.set(false);
        this.closeResetConfirmModal();
        this.tempPasswordData.set({
          userName: user.name,
          temporaryPassword: res.temporaryPassword,
          title: 'Senha Resetada com Sucesso',
        });
        this.tempPasswordModalOpen.set(true);
        this.toastService.success('Senha temporária gerada com sucesso.');
      },
      error: (err) => {
        this.isResetting.set(false);
        let reason = 'Erro ao resetar senha do usuário.';
        if (err.error?.message) {
          reason = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.toastService.error(reason);
      },
    });
  }

  copyTempPassword(): void {
    const pwd = this.tempPasswordData()?.temporaryPassword;
    if (pwd) {
      navigator.clipboard.writeText(pwd).then(() => {
        this.copied.set(true);
        this.toastService.success('Senha copiada!');
        setTimeout(() => this.copied.set(false), 3000);
      });
    }
  }

  closeTempPasswordModal(): void {
    this.tempPasswordModalOpen.set(false);
    this.tempPasswordData.set(null);
  }

  toggleStatus(user: User): void {
    if (user.id === this.currentUser()?.id) {
      this.toastService.warning('Você não pode alterar o status do seu próprio usuário.');
      return;
    }

    const newStatus = !user.isActive;
    this.authRepository.toggleUserStatus(user.id, newStatus).subscribe({
      next: (updatedUser) => {
        this.users.update((list) =>
          list.map((u) => (u.id === updatedUser.id ? updatedUser : u))
        );
        this.toastService.success(updatedUser.isActive ? 'Usuário ativado com sucesso!' : 'Acesso do usuário suspenso.');
      },
      error: () => {
        this.toastService.error('Erro ao alterar status do usuário.');
      }
    });
  }
}

