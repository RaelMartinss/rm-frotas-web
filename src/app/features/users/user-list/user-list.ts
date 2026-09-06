import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { IAuthRepository } from '../../../domain/repositories/auth.repository.interface';
import { ToastService } from '../../../core/services/toast.service';
import { User, UserRole } from '../../../domain/models/auth.model';
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
  LucideChevronsRight
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
    LucideChevronsRight
  ],
  templateUrl: './user-list.html'
})
export class UserListComponent implements OnInit {
  private readonly authRepository = inject(IAuthRepository);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  users = signal<User[]>([]);
  loading = signal<boolean>(true);
  isModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

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

  // Counts computados para os chips de filtro
  totalCount = computed(() => this.users().length);
  managerCount = computed(
    () =>
      this.users().filter(
        (u) => u.role === 'FLEET_MANAGER' || u.role === 'ADMIN' || u.role === 'MANAGER'
      ).length
  );
  driverRoleCount = computed(
    () => this.users().filter((u) => u.role === 'DRIVER').length
  );

  filteredUsers = computed(() => {
    const list = this.users();
    const term = this.searchTerm().toLowerCase().trim();
    const role = this.selectedRole();

    return list.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);

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
    role: ['FLEET_MANAGER' as UserRole, [Validators.required]],
    password: ['Mudar@123', [Validators.minLength(6)]]
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
    this.userForm.reset({
      name: '',
      email: '',
      role: 'FLEET_MANAGER',
      password: 'Mudar@123'
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
      next: (newUser) => {
        this.users.update((list) => [newUser, ...list]);
        this.isSaving.set(false);
        this.toastService.success('Novo usuário cadastrado com sucesso!');
        this.closeModal();
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

  toggleStatus(user: User): void {
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
