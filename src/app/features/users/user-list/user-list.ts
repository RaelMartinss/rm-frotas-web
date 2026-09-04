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
  LucideShieldAlert,
  LucideAlertCircle
} from '@lucide/angular';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideUserPlus,
    LucideSearch,
    LucideLoader2,
    LucideX,
    LucideCheckCircle2,
    LucideXCircle,
    LucideShieldAlert,
    LucideAlertCircle
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

  userForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    role: ['OPERATOR' as UserRole, [Validators.required]]
  });

  ngOnInit(): void {
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

  setRoleFilter(role: string): void {
    this.selectedRole.set(role);
  }

  openModal(): void {
    this.errorMessage.set(null);
    this.userForm.reset({ role: 'OPERATOR' });
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
        this.toastService.success('Usuário cadastrado com sucesso!');
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
        this.toastService.success(updatedUser.isActive ? 'Usuário ativado com sucesso!' : 'Usuário desativado com sucesso!');
      },
      error: () => {
        this.toastService.error('Erro ao alterar status do usuário.');
      }
    });
  }
}

