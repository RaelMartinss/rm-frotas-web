import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { IVehicleRepository } from '../../domain/repositories/vehicle.repository.interface';
import { IMaintenanceRepository } from '../../domain/repositories/maintenance.repository.interface';
import { ToastService } from '../../core/services/toast.service';
import { ImpersonationService } from '../../core/services/impersonation.service';
import { Vehicle } from '../../domain/models/vehicle.model';
import { Maintenance } from '../../domain/models/maintenance.model';
import { getVehicleBrandLogo } from '../../core/utils/vehicle-brand.util';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';
import { VehicleFormModalComponent } from './components/vehicle-form-modal/vehicle-form-modal.component';
import { VehicleUpdateKmModalComponent } from './components/vehicle-update-km-modal/vehicle-update-km-modal.component';
import { VehicleUpdateCrlvModalComponent } from './components/vehicle-update-crlv-modal/vehicle-update-crlv-modal.component';
import { VehicleSendMaintenanceModalComponent } from './components/vehicle-send-maintenance-modal/vehicle-send-maintenance-modal.component';
import { VehicleMaintenanceInfoModalComponent } from './components/vehicle-maintenance-info-modal/vehicle-maintenance-info-modal.component';
import { VehicleFinishMaintenanceModalComponent } from './components/vehicle-finish-maintenance-modal/vehicle-finish-maintenance-modal.component';
import { VehicleDetailsModalComponent } from './components/vehicle-details-modal/vehicle-details-modal.component';
import { VehicleImportModalComponent } from './components/vehicle-import-modal/vehicle-import-modal.component';
import {
  LucideTruck,
  LucidePlus,
  LucideSearch,
  LucideX,
  LucideWrench,
  LucideGauge,
  LucideEye,
  LucideCalendar,
  LucideFileText,
  LucideFuel,
  LucideCheckCircle2,
  LucideEllipsisVertical,
  LucidePencil
} from '@lucide/angular';

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    RouterLink,
    ReactiveFormsModule,
    PaginationComponent,
    VehicleFormModalComponent,
    VehicleUpdateKmModalComponent,
    VehicleUpdateCrlvModalComponent,
    VehicleSendMaintenanceModalComponent,
    VehicleMaintenanceInfoModalComponent,
    VehicleFinishMaintenanceModalComponent,
    VehicleDetailsModalComponent,
    VehicleImportModalComponent,
    LucideTruck,
    LucidePlus,
    LucideSearch,
    LucideX,
    LucideWrench,
    LucideGauge,
    LucideEye,
    LucideCalendar,
    LucideFileText,
    LucideFuel,
    LucideCheckCircle2,
    LucideEllipsisVertical,
    LucidePencil
  ],
  templateUrl: './vehicle-list.html',
  styleUrl: './vehicle-list.css'
})
export class VehicleListComponent implements OnInit {
  private readonly vehicleRepository = inject(IVehicleRepository);
  private readonly maintenanceRepository = inject(IMaintenanceRepository);
  private readonly toastService = inject(ToastService);
  protected readonly impersonationService = inject(ImpersonationService);
  readonly getBrandLogo = getVehicleBrandLogo;

  vehicles = signal<Vehicle[]>([]);
  activeMaintenancesMap = signal<Map<string, Maintenance>>(new Map());
  loading = signal<boolean>(true);

  // Paginação Server-Side
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalItems = signal<number>(0);
  pageSizeOptions: number[] = [10, 25, 50];

  // Controle de Modais
  isModalOpen = signal<boolean>(false);
  isImportModalOpen = signal<boolean>(false);
  selectedVehicle = signal<Vehicle | null>(null);
  isSendMaintenanceModalOpen = signal<boolean>(false);
  isMaintenanceInfoModalOpen = signal<boolean>(false);
  selectedMaintenanceForInfo = signal<Maintenance | null>(null);
  isFinishMaintenanceModalOpen = signal<boolean>(false);
  isUpdateKmModalOpen = signal<boolean>(false);
  isUpdateCrlvModalOpen = signal<boolean>(false);
  isDetailsModalOpen = signal<boolean>(false);
  activeDropdownVehicleId = signal<string | null>(null);

  // Busca e Filtros
  searchControl = new FormControl('', { nonNullable: true });
  selectedStatus = signal<string>('ALL');

  searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadVehicles();
      });

    this.loadVehicles();
  }

  loadVehicles(): void {
    this.loading.set(true);

    this.vehicleRepository
      .getAll({
        page: this.currentPage(),
        limit: this.pageSize(),
        search: this.searchControl.value,
        status: this.selectedStatus(),
      })
      .subscribe({
        next: (response) => {
          this.vehicles.set(response.data || []);
          this.totalItems.set(response.total || 0);
          this.loading.set(false);
          this.loadActiveMaintenances();
        },
        error: () => {
          this.loading.set(false);
          this.toastService.error('Erro ao carregar lista de veículos.');
        }
      });
  }

  loadActiveMaintenances(): void {
    this.maintenanceRepository.getAll({ limit: 100 }).subscribe({
      next: (res) => {
        const map = new Map<string, Maintenance>();
        for (const m of res.data) {
          if (m.status === 'EM_ANDAMENTO') {
            map.set(m.vehicleId, m);
          } else if (m.status === 'AGENDADA' && !map.has(m.vehicleId)) {
            map.set(m.vehicleId, m);
          }
        }
        this.activeMaintenancesMap.set(map);
      },
      error: () => {}
    });
  }

  setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.loadVehicles();
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.currentPage.set(1);
    this.loadVehicles();
  }

  setPage(page: number): void {
    if (page < 1 || page === this.currentPage()) return;
    this.currentPage.set(page);
    this.loadVehicles();
  }

  setPageSize(newSize: number): void {
    this.pageSize.set(newSize);
    this.currentPage.set(1);
    this.loadVehicles();
  }

  // --- CONTROLE DE MODAIS ---
  openModal(): void {
    if (this.impersonationService.isReadOnly()) return;
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  onVehicleCreated(): void {
    this.currentPage.set(1);
    this.loadVehicles();
  }

  openImportModal(): void {
    if (this.impersonationService.isReadOnly()) return;
    this.isImportModalOpen.set(true);
  }

  closeImportModal(): void {
    this.isImportModalOpen.set(false);
  }

  openMaintenanceAction(vehicle: Vehicle): void {
    if (this.impersonationService.isReadOnly()) return;
    this.selectedVehicle.set(vehicle);
    const existing = this.activeMaintenancesMap().get(vehicle.id);

    if (existing || this.isInMaintenance(vehicle)) {
      if (existing) {
        this.selectedMaintenanceForInfo.set(existing);
        this.isMaintenanceInfoModalOpen.set(true);
      } else {
        this.maintenanceRepository.getAll({ vehicleId: vehicle.id, limit: 5 }).subscribe({
          next: (res) => {
            const activeOrScheduled = res.data.find(m => m.status === 'EM_ANDAMENTO' || m.status === 'AGENDADA');
            if (activeOrScheduled) {
              this.selectedMaintenanceForInfo.set(activeOrScheduled);
              this.isMaintenanceInfoModalOpen.set(true);
            } else {
              this.openSendMaintenanceModal(vehicle);
            }
          },
          error: () => {
            this.openSendMaintenanceModal(vehicle);
          }
        });
      }
    } else {
      this.openSendMaintenanceModal(vehicle);
    }
  }

  getMaintenanceButtonTitle(vehicle: Vehicle): string {
    if (this.isInMaintenance(vehicle)) {
      return 'Ver Manutenção em Andamento';
    }
    if (this.activeMaintenancesMap().get(vehicle.id)?.status === 'AGENDADA') {
      return 'Ver Manutenção Agendada';
    }
    return 'Registrar / Agendar Manutenção';
  }

  getMaintenanceButtonClass(vehicle: Vehicle): string {
    if (this.isInMaintenance(vehicle)) {
      return 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200';
    }
    if (this.activeMaintenancesMap().get(vehicle.id)?.status === 'AGENDADA') {
      return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
    }
    return 'text-amber-600 hover:bg-amber-50 border-amber-200/60';
  }

  openSendMaintenanceModal(vehicle: Vehicle): void {
    if (this.impersonationService.isReadOnly()) return;
    this.selectedVehicle.set(vehicle);
    this.isSendMaintenanceModalOpen.set(true);
  }

  closeSendMaintenanceModal(): void {
    this.isSendMaintenanceModalOpen.set(false);
  }

  openMaintenanceInfoModal(vehicle: Vehicle, maintenance: Maintenance): void {
    this.selectedVehicle.set(vehicle);
    this.selectedMaintenanceForInfo.set(maintenance);
    this.isMaintenanceInfoModalOpen.set(true);
  }

  closeMaintenanceInfoModal(): void {
    this.isMaintenanceInfoModalOpen.set(false);
    this.selectedMaintenanceForInfo.set(null);
  }

  openFinishMaintenanceModal(vehicle: Vehicle): void {
    if (this.impersonationService.isReadOnly()) return;
    this.selectedVehicle.set(vehicle);
    this.isFinishMaintenanceModalOpen.set(true);
  }

  closeFinishMaintenanceModal(): void {
    this.isFinishMaintenanceModalOpen.set(false);
  }

  openUpdateKmModal(vehicle: Vehicle): void {
    if (this.impersonationService.isReadOnly()) return;
    this.selectedVehicle.set(vehicle);
    this.isUpdateKmModalOpen.set(true);
  }

  closeUpdateKmModal(): void {
    this.isUpdateKmModalOpen.set(false);
  }

  openUpdateCrlvModal(vehicle: Vehicle): void {
    if (this.impersonationService.isReadOnly()) return;
    this.selectedVehicle.set(vehicle);
    this.isUpdateCrlvModalOpen.set(true);
  }

  closeUpdateCrlvModal(): void {
    this.isUpdateCrlvModalOpen.set(false);
  }

  onCrlvUpdated(updatedVehicle: Vehicle): void {
    if (this.isDetailsModalOpen() && this.selectedVehicle()?.id === updatedVehicle.id) {
      this.selectedVehicle.set(updatedVehicle);
    }
    this.loadVehicles();
  }

  openDetailsModal(vehicle: Vehicle): void {
    this.selectedVehicle.set(vehicle);
    this.isDetailsModalOpen.set(true);
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedVehicle.set(null);
  }

  toggleDropdown(vehicleId: string): void {
    this.activeDropdownVehicleId.update((current) => (current === vehicleId ? null : vehicleId));
  }

  closeDropdown(): void {
    this.activeDropdownVehicleId.set(null);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.activeDropdownVehicleId()) {
      this.activeDropdownVehicleId.set(null);
    }
  }

  // --- HELPERS VISUAIS ---
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
        return 'Indisponível';
      case 'INDISPONIVEL':
        return 'Indisponível';
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

  isInUse(vehicle?: Vehicle | null): boolean {
    if (!vehicle) return false;
    return vehicle.status === 'IN_USE' || vehicle.status === 'EM_VIAGEM';
  }

  isInMaintenance(vehicle: Vehicle): boolean {
    return vehicle.status === 'IN_MAINTENANCE' || vehicle.status === 'MANUTENCAO';
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
