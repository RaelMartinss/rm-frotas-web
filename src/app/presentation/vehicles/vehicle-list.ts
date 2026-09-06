import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { IVehicleRepository } from '../../domain/repositories/vehicle.repository.interface';
import { ToastService } from '../../core/services/toast.service';
import { Vehicle } from '../../domain/models/vehicle.model';
import { PlateMaskDirective } from '../shared/directives/input-mask.directives';
import {
  LucideTruck,
  LucidePlus,
  LucideSearch,
  LucideLoader2,
  LucideX,
  LucideAlertCircle,
  LucideWrench,
  LucideCheckCircle2,
  LucideGauge,
  LucideEye,
  LucideCalendar
} from '@lucide/angular';

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PlateMaskDirective,
    LucideTruck,
    LucidePlus,
    LucideSearch,
    LucideLoader2,
    LucideX,
    LucideAlertCircle,
    LucideWrench,
    LucideCheckCircle2,
    LucideGauge,
    LucideEye,
    LucideCalendar
  ],
  templateUrl: './vehicle-list.html',
  styleUrl: './vehicle-list.css'
})
export class VehicleListComponent implements OnInit {
  private readonly vehicleRepository = inject(IVehicleRepository);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  vehicles = signal<Vehicle[]>([]);
  loading = signal<boolean>(true);

  // Modais de Criação e Ações
  isModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  selectedVehicle = signal<Vehicle | null>(null);
  isSendMaintenanceModalOpen = signal<boolean>(false);
  isFinishMaintenanceModalOpen = signal<boolean>(false);
  isUpdateKmModalOpen = signal<boolean>(false);
  isDetailsModalOpen = signal<boolean>(false);
  isActionLoading = signal<boolean>(false);
  actionError = signal<string | null>(null);

  // --- FILTROS E BUSCA REATIVA ---
  searchControl = new FormControl('', { nonNullable: true });
  selectedStatus = signal<string>('ALL');

  // Converte as mudanças do input para Signal aplicando debounce de 300ms
  searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  // Counts computados para os chips de filtro
  totalCount = computed(() => this.vehicles().length);
  availableCount = computed(() => this.vehicles().filter((v) => this.isAvailable(v)).length);
  inUseCount = computed(
    () => this.vehicles().filter((v) => v.status === 'IN_USE' || v.status === 'EM_VIAGEM').length
  );
  inMaintenanceCount = computed(
    () => this.vehicles().filter((v) => this.isInMaintenance(v)).length
  );

  // Limite de renderização progressiva (Infinite Scroll / Smooth Chunking)
  displayLimit = signal<number>(50);

  // Signal Computado para filtrar a lista automaticamente
  filteredVehicles = computed(() => {
    const list = this.vehicles();
    const term = this.searchTerm().toLowerCase().trim();
    const status = this.selectedStatus();

    return list.filter((vehicle) => {
      const matchesSearch =
        vehicle.plate.toLowerCase().includes(term) ||
        vehicle.model.toLowerCase().includes(term) ||
        (vehicle.brand && vehicle.brand.toLowerCase().includes(term));

      let matchesStatus = status === 'ALL';
      if (!matchesStatus) {
        if (status === 'AVAILABLE') {
          matchesStatus = vehicle.status === 'AVAILABLE' || vehicle.status === 'DISPONIVEL';
        } else if (status === 'IN_USE') {
          matchesStatus = vehicle.status === 'IN_USE' || vehicle.status === 'EM_VIAGEM';
        } else if (status === 'IN_MAINTENANCE') {
          matchesStatus = vehicle.status === 'IN_MAINTENANCE' || vehicle.status === 'MANUTENCAO';
        } else {
          matchesStatus = vehicle.status === status;
        }
      }

      return matchesSearch && matchesStatus;
    });
  });

  // Lista fatiada para exibição fluida e 60fps no DOM sem congelar o navegador
  displayedVehicles = computed(() => {
    return this.filteredVehicles().slice(0, this.displayLimit());
  });

  hasMore = computed(() => {
    return this.displayedVehicles().length < this.filteredVehicles().length;
  });

  remainingCount = computed(() => {
    return Math.max(0, this.filteredVehicles().length - this.displayedVehicles().length);
  });

  loadMore(): void {
    this.displayLimit.update((limit) => limit + 50);
  }

  showAll(): void {
    this.displayLimit.set(this.filteredVehicles().length);
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'AVAILABLE':
      case 'DISPONIVEL':
        return 'Disponível';
      case 'IN_USE':
      case 'EM_VIAGEM':
        return 'Em viagem';
      case 'IN_MAINTENANCE':
      case 'MANUTENCAO':
        return 'Em manutenção';
      default:
        return status || 'Indisponível';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'AVAILABLE':
      case 'DISPONIVEL':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
      case 'IN_USE':
      case 'EM_VIAGEM':
        return 'bg-blue-50 text-blue-700 border-blue-200/70';
      case 'IN_MAINTENANCE':
      case 'MANUTENCAO':
        return 'bg-amber-50 text-amber-700 border-amber-200/70';
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200/70';
    }
  }

  getStatusDotClass(status: string): string {
    switch (status) {
      case 'AVAILABLE':
      case 'DISPONIVEL':
        return 'bg-emerald-500';
      case 'IN_USE':
      case 'EM_VIAGEM':
        return 'bg-blue-500';
      case 'IN_MAINTENANCE':
      case 'MANUTENCAO':
        return 'bg-amber-500';
      default:
        return 'bg-rose-500';
    }
  }

  isAvailable(vehicle: Vehicle): boolean {
    return vehicle.status === 'AVAILABLE' || vehicle.status === 'DISPONIVEL';
  }

  isInMaintenance(vehicle: Vehicle): boolean {
    return vehicle.status === 'IN_MAINTENANCE' || vehicle.status === 'MANUTENCAO';
  }

  vehicleForm: FormGroup = this.fb.group({
    plate: ['', [
      Validators.required,
      Validators.pattern(/^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$/i)
    ]],
    brand: ['', [Validators.required]],
    model: ['', [Validators.required]],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(1900)]],
    currentKm: [0, [Validators.required, Validators.min(0)]],
    crlvExpiration: ['']
  });

  updateKmForm: FormGroup = this.fb.group({
    currentKm: [0, [Validators.required, Validators.min(0)]]
  });

  clearSearch(): void {
    this.searchControl.setValue('');
    this.displayLimit.set(50);
  }

  ngOnInit(): void {
    this.searchControl.valueChanges.subscribe(() => {
      this.displayLimit.set(50);
    });
    this.loadVehicles();
  }

  loadVehicles(): void {
    this.loading.set(true);
    this.vehicleRepository.getAll().subscribe({
      next: (data) => {
        this.vehicles.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastService.error('Erro ao carregar lista de veículos.');
      }
    });
  }

  setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
    this.displayLimit.set(50);
  }

  openModal(): void {
    this.errorMessage.set(null);
    this.vehicleForm.reset({ year: new Date().getFullYear(), currentKm: 0, crlvExpiration: '' });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.errorMessage.set(null);
  }

  saveVehicle(): void {
    this.errorMessage.set(null);

    if (this.vehicleForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      this.toastService.error('Por favor, preencha todos os campos obrigatórios corretamente.');
      return;
    }

    this.isSaving.set(true);
    const formValue = this.vehicleForm.value;

    this.vehicleRepository.create(formValue).subscribe({
      next: (newVehicle) => {
        this.vehicles.update((list) => [newVehicle, ...list]);
        this.isSaving.set(false);
        this.toastService.success('Veículo cadastrado com sucesso!');
        this.closeModal();
      },
      error: (err) => {
        this.isSaving.set(false);
        let msg = 'Erro ao cadastrar veículo. Verifique os dados informados.';
        if (err.error?.message) {
          msg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.errorMessage.set(msg);
        this.toastService.error(`Veículo não cadastrado: ${msg}`);
      }
    });
  }

  // --- AÇÕES: ENVIAR PARA MANUTENÇÃO ---
  openSendMaintenanceModal(vehicle: Vehicle): void {
    this.selectedVehicle.set(vehicle);
    this.actionError.set(null);
    this.isSendMaintenanceModalOpen.set(true);
  }

  closeSendMaintenanceModal(): void {
    this.isSendMaintenanceModalOpen.set(false);
    this.actionError.set(null);
    this.selectedVehicle.set(null);
  }

  confirmSendMaintenance(): void {
    const vehicle = this.selectedVehicle();
    if (!vehicle) return;

    this.isActionLoading.set(true);
    this.actionError.set(null);

    this.vehicleRepository.sendToMaintenance(vehicle.id).subscribe({
      next: (updatedVehicle) => {
        this.vehicles.update((list) =>
          list.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v))
        );
        this.isActionLoading.set(false);
        this.toastService.success(`Veículo ${vehicle.plate} enviado para manutenção!`);
        this.closeSendMaintenanceModal();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        const msg = err.error?.message || 'Não foi possível enviar o veículo para manutenção.';
        this.actionError.set(msg);
        this.toastService.error(msg);
      }
    });
  }

  // --- AÇÕES: FINALIZAR MANUTENÇÃO ---
  openFinishMaintenanceModal(vehicle: Vehicle): void {
    this.selectedVehicle.set(vehicle);
    this.actionError.set(null);
    this.isFinishMaintenanceModalOpen.set(true);
  }

  closeFinishMaintenanceModal(): void {
    this.isFinishMaintenanceModalOpen.set(false);
    this.actionError.set(null);
    this.selectedVehicle.set(null);
  }

  confirmFinishMaintenance(): void {
    const vehicle = this.selectedVehicle();
    if (!vehicle) return;

    this.isActionLoading.set(true);
    this.actionError.set(null);

    this.vehicleRepository.finishMaintenance(vehicle.id).subscribe({
      next: (updatedVehicle) => {
        this.vehicles.update((list) =>
          list.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v))
        );
        this.isActionLoading.set(false);
        this.toastService.success(`Manutenção finalizada! Veículo ${vehicle.plate} disponível.`);
        this.closeFinishMaintenanceModal();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        const msg = err.error?.message || 'Não foi possível finalizar a manutenção.';
        this.actionError.set(msg);
        this.toastService.error(msg);
      }
    });
  }

  // --- AÇÕES: ATUALIZAR QUILOMETRAGEM ---
  openUpdateKmModal(vehicle: Vehicle): void {
    this.selectedVehicle.set(vehicle);
    this.actionError.set(null);
    this.updateKmForm.reset({ currentKm: vehicle.currentKm });
    this.updateKmForm.get('currentKm')?.setValidators([
      Validators.required,
      Validators.min(vehicle.currentKm)
    ]);
    this.updateKmForm.get('currentKm')?.updateValueAndValidity();
    this.isUpdateKmModalOpen.set(true);
  }

  closeUpdateKmModal(): void {
    this.isUpdateKmModalOpen.set(false);
    this.actionError.set(null);
    this.selectedVehicle.set(null);
  }

  confirmUpdateKm(): void {
    const vehicle = this.selectedVehicle();
    if (!vehicle) return;

    if (this.updateKmForm.invalid) {
      this.updateKmForm.markAllAsTouched();
      this.toastService.error('Informe um valor de quilometragem válido maior ou igual ao atual.');
      return;
    }

    const newKm = Number(this.updateKmForm.value.currentKm);
    this.isActionLoading.set(true);
    this.actionError.set(null);

    this.vehicleRepository.updateKm(vehicle.id, newKm).subscribe({
      next: (updatedVehicle) => {
        this.vehicles.update((list) =>
          list.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v))
        );
        this.isActionLoading.set(false);
        this.toastService.success(`Quilometragem do veículo ${vehicle.plate} atualizada para ${newKm} km!`);
        this.closeUpdateKmModal();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        const msg = err.error?.message || 'Não foi possível atualizar a quilometragem.';
        this.actionError.set(msg);
        this.toastService.error(msg);
      }
    });
  }

  // --- AÇÕES: FICHA / DETALHES DO VEÍCULO ---
  openDetailsModal(vehicle: Vehicle): void {
    this.selectedVehicle.set(vehicle);
    this.isDetailsModalOpen.set(true);
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedVehicle.set(null);
  }

  isCrlvExpired(crlvExpiration?: string): boolean {
    if (!crlvExpiration) return false;
    const expDate = new Date(crlvExpiration);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expDate < today;
  }

  isCrlvExpiringSoon(crlvExpiration?: string): boolean {
    if (!crlvExpiration) return false;
    const expDate = new Date(crlvExpiration);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }
}

