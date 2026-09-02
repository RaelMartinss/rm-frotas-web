import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { IAuthRepository } from '../../../domain/repositories/auth.repository.interface';
import { User, UserRole } from '../../../domain/models/auth.model';
import {
  LucideUsers,
  LucideUserPlus,
  LucideSearch,
  LucideLoader2,
  LucideX,
  LucideCheckCircle2,
  LucideXCircle,
  LucideShieldAlert
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
    LucideShieldAlert
  ],
  templateUrl: './user-list.html'
})
export class UserListComponent implements OnInit {
  private readonly authRepository = inject(IAuthRepository);
  private readonly fb = inject(FormBuilder);

  users = signal<User[]>([]);
  loading = signal<boolean>(true);
  isModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);

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
      error: () => this.loading.set(false)
    });
  }

  setRoleFilter(role: string): void {
    this.selectedRole.set(role);
  }

  openModal(): void {
    this.userForm.reset({ role: 'OPERATOR' });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.authRepository.createUser(this.userForm.value).subscribe({
      next: (newUser) => {
        this.users.update((list) => [newUser, ...list]);
        this.isSaving.set(false);
        this.closeModal();
      },
      error: () => this.isSaving.set(false)
    });
  }

  toggleStatus(user: User): void {
    const newStatus = !user.isActive;
    this.authRepository.toggleUserStatus(user.id, newStatus).subscribe({
      next: (updatedUser) => {
        this.users.update((list) =>
          list.map((u) => (u.id === updatedUser.id ? updatedUser : u))
        );
      }
    });
  }
}
