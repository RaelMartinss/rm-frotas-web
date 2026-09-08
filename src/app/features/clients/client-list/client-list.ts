import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { IClientRepository } from '../../../domain/repositories/client.repository.interface';
import { ToastService } from '../../../core/services/toast.service';
import { Client, ClientStatus, OnboardClientResponse } from '../../../domain/models/client.model';
import {
  LucideBuilding2,
  LucidePlus,
  LucideSearch,
  LucideLoader2,
  LucideX,
  LucideCheckCircle2,
  LucideAlertTriangle,
  LucideBan,
  LucideRefreshCw,
  LucideCopy,
  LucideCheck,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight,
  LucideShieldAlert,
  LucideKeyRound,
  LucideMapPin,
  LucideUserCheck,
} from '@lucide/angular';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideBuilding2,
    LucidePlus,
    LucideSearch,
    LucideLoader2,
    LucideX,
    LucideCheckCircle2,
    LucideAlertTriangle,
    LucideBan,
    LucideRefreshCw,
    LucideCopy,
    LucideCheck,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronsLeft,
    LucideChevronsRight,
    LucideShieldAlert,
    LucideKeyRound,
    LucideMapPin,
    LucideUserCheck,
  ],
  templateUrl: './client-list.html',
})
export class ClientListComponent implements OnInit {
  private readonly clientRepository = inject(IClientRepository);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  clients = signal<Client[]>([]);
  totalCount = signal<number>(0);
  loading = signal<boolean>(true);

  // Paginação & Busca
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  pageSizeOptions: number[] = [10, 25, 50];
  selectedStatus = signal<string>('ALL');
  searchControl = new FormControl('', { nonNullable: true });

  // Modais
  isOnboardModalOpen = signal<boolean>(false);
  isSuccessModalOpen = signal<boolean>(false);
  onboardResult = signal<OnboardClientResponse | null>(null);
  copied = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Modal de Ação de Status
  actionModalOpen = signal<boolean>(false);
  actionType = signal<'SUSPEND' | 'REACTIVATE' | 'CANCEL' | null>(null);
  selectedClient = signal<Client | null>(null);
  isActionLoading = signal<boolean>(false);

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);

  startIndex = computed(() => {
    if (this.totalCount() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.totalCount());
  });

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

  onboardForm: FormGroup = this.fb.group({
    legalName: ['', [Validators.required, Validators.minLength(3)]],
    tradeName: ['', [Validators.required, Validators.minLength(2)]],
    document: ['', [Validators.required, Validators.minLength(11)]],
    billingEmail: ['', [Validators.required, Validators.email]],
    address: this.fb.group({
      zipCode: [''],
      street: [''],
      number: [''],
      complement: [''],
      neighborhood: [''],
      city: [''],
      state: [''],
    }),
    fleetManagerName: ['', [Validators.required, Validators.minLength(3)]],
    fleetManagerEmail: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadClients();
      });

    this.loadClients();
  }

  loadClients(): void {
    this.loading.set(true);
    this.clientRepository
      .listAll({
        page: this.currentPage(),
        limit: this.pageSize(),
        search: this.searchControl.value.trim() || undefined,
        status: this.selectedStatus() !== 'ALL' ? this.selectedStatus() : undefined,
      })
      .subscribe({
        next: (data) => {
          this.clients.set(data.clients);
          this.totalCount.set(data.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.error('Erro ao carregar lista de empresas clientes.');
        },
      });
  }

  setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.loadClients();
  }

  setPage(page: number | string): void {
    if (typeof page !== 'number' || page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }
    this.currentPage.set(page);
    this.loadClients();
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
    this.loadClients();
  }

  openOnboardModal(): void {
    this.errorMessage.set(null);
    this.onboardForm.reset();
    this.isOnboardModalOpen.set(true);
  }

  closeOnboardModal(): void {
    this.isOnboardModalOpen.set(false);
    this.errorMessage.set(null);
  }

  submitOnboard(): void {
    this.errorMessage.set(null);

    if (this.onboardForm.invalid) {
      this.onboardForm.markAllAsTouched();
      this.toastService.error('Por favor, preencha todos os campos obrigatórios corretamente.');
      return;
    }

    this.isSaving.set(true);
    const formVal = this.onboardForm.value;

    const payload = {
      legalName: formVal.legalName,
      tradeName: formVal.tradeName,
      document: formVal.document,
      billingEmail: formVal.billingEmail,
      address: formVal.address?.street ? formVal.address : undefined,
      fleetManagerName: formVal.fleetManagerName,
      fleetManagerEmail: formVal.fleetManagerEmail,
    };

    this.clientRepository.onboard(payload).subscribe({
      next: (response) => {
        this.isSaving.set(false);
        this.closeOnboardModal();
        this.onboardResult.set(response);
        this.isSuccessModalOpen.set(true);
        this.loadClients();
        this.toastService.success('Cliente e Gestor de Frota cadastrados com sucesso!');
      },
      error: (err) => {
        this.isSaving.set(false);
        let reason = 'Erro ao cadastrar cliente.';
        if (err.error?.message) {
          reason = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.errorMessage.set(reason);
        this.toastService.error(reason);
      },
    });
  }

  copyPassword(): void {
    const password = this.onboardResult()?.fleetManager.temporaryPassword;
    if (password) {
      navigator.clipboard.writeText(password).then(() => {
        this.copied.set(true);
        this.toastService.success('Senha temporária copiada para a área de transferência!');
        setTimeout(() => this.copied.set(false), 3000);
      });
    }
  }

  closeSuccessModal(): void {
    this.isSuccessModalOpen.set(false);
    this.onboardResult.set(null);
  }

  openActionModal(client: Client, type: 'SUSPEND' | 'REACTIVATE' | 'CANCEL'): void {
    this.selectedClient.set(client);
    this.actionType.set(type);
    this.actionModalOpen.set(true);
  }

  closeActionModal(): void {
    this.actionModalOpen.set(false);
    this.selectedClient.set(null);
    this.actionType.set(null);
  }

  executeAction(): void {
    const client = this.selectedClient();
    const type = this.actionType();
    if (!client || !type) return;

    this.isActionLoading.set(true);

    const call$ =
      type === 'SUSPEND'
        ? this.clientRepository.suspend(client.id)
        : type === 'REACTIVATE'
        ? this.clientRepository.reactivate(client.id)
        : this.clientRepository.cancel(client.id);

    call$.subscribe({
      next: (updatedClient) => {
        this.isActionLoading.set(false);
        this.clients.update((list) =>
          list.map((c) => (c.id === updatedClient.id ? updatedClient : c))
        );
        this.closeActionModal();
        const actionLabels = {
          SUSPEND: 'suspenso',
          REACTIVATE: 'reativado',
          CANCEL: 'cancelado',
        };
        this.toastService.success(`Cliente ${actionLabels[type]} com sucesso.`);
      },
      error: (err) => {
        this.isActionLoading.set(false);
        let reason = 'Erro ao executar ação.';
        if (err.error?.message) {
          reason = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.toastService.error(reason);
      },
    });
  }

  formatCpfCnpj(val?: string): string {
    if (!val) return '-';
    const clean = val.replace(/\D/g, '');
    if (clean.length === 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (clean.length === 14) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return val;
  }
}
