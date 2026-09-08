import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { IVehicleRepository } from '../../domain/repositories/vehicle.repository.interface';
import { IMaintenanceRepository } from '../../domain/repositories/maintenance.repository.interface';
import { IFuelRepository } from '../../domain/repositories/fuel.repository.interface';
import { ToastService } from '../../core/services/toast.service';
import { Vehicle, VehicleImportResult } from '../../domain/models/vehicle.model';
import { Maintenance, MaintenanceStatus, MaintenanceType } from '../../domain/models/maintenance.model';
import { FuelRecord, FuelType } from '../../domain/models/fuel.model';
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
  LucideCalendar,
  LucidePlay,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight,
  LucideFileText,
  LucideAlertTriangle,
  LucideCheck,
  LucideExternalLink,
  LucideFuel,
  LucideRefreshCw
} from '@lucide/angular';

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
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
    LucideCalendar,
    LucidePlay,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronsLeft,
    LucideChevronsRight,
    LucideFileText,
    LucideAlertTriangle,
    LucideCheck,
    LucideExternalLink,
    LucideFuel,
    LucideRefreshCw
  ],
  templateUrl: './vehicle-list.html',
  styleUrl: './vehicle-list.css'
})
export class VehicleListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly vehicleRepository = inject(IVehicleRepository);
  private readonly maintenanceRepository = inject(IMaintenanceRepository);
  private readonly fuelRepository = inject(IFuelRepository);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  vehicles = signal<Vehicle[]>([]);
  vehicleMaintenances = signal<Maintenance[]>([]);
  vehicleFuelRecords = signal<FuelRecord[]>([]);
  activeMaintenancesMap = signal<Map<string, Maintenance>>(new Map());
  isLoadingMaintenances = signal(false);
  isLoadingFuelRecords = signal(false);
  activeDetailsTab = signal<'OVERVIEW' | 'MAINTENANCE' | 'FUEL'>('OVERVIEW');
  loading = signal<boolean>(true);

  // --- IMPORTAÇÃO EM LOTE VIA CSV ---
  isImportModalOpen = signal<boolean>(false);
  isImporting = signal<boolean>(false);
  selectedFile = signal<File | null>(null);
  importResult = signal<VehicleImportResult | null>(null);
  importErrorMessage = signal<string | null>(null);
  isDragging = signal<boolean>(false);

  // --- PAGINAÇÃO SERVER-SIDE (OFFSET / LIMIT) ---
  currentPage = signal<number>(1);
  pageSize = signal<number>(10); // Inicializa com 10 registros
  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  pageSizeOptions: number[] = [10, 25, 50];

  // Modais de Criação e Ações
  isModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  selectedVehicle = signal<Vehicle | null>(null);
  isSendMaintenanceModalOpen = signal<boolean>(false);
  isMaintenanceInfoModalOpen = signal<boolean>(false);
  selectedMaintenanceForInfo = signal<Maintenance | null>(null);
  isFinishMaintenanceModalOpen = signal<boolean>(false);
  isUpdateKmModalOpen = signal<boolean>(false);
  isUpdateCrlvModalOpen = signal<boolean>(false);
  isDetailsModalOpen = signal<boolean>(false);
  isActionLoading = signal<boolean>(false);
  actionError = signal<string | null>(null);

  // --- FILTROS E BUSCA REATIVA COM SERVER-SIDE QUERY ---
  searchControl = new FormControl('', { nonNullable: true });
  selectedStatus = signal<string>('ALL');

  searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  // Computed ranges para exibição na barra de paginação
  startIndex = computed(() => {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.totalItems());
  });

  // Gera lista de páginas com elipses (ex: [1, 2, 3, '...', 10])
  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 1; // páginas visíveis ao redor da atual
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
    this.loadVehicles();
  }

  setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.loadVehicles();
  }

  setPage(page: number | string): void {
    if (typeof page !== 'number' || page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }
    this.currentPage.set(page);
    this.loadVehicles();
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
    this.loadVehicles();
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

  updateCrlvForm: FormGroup = this.fb.group({
    crlvExpiration: ['', [Validators.required]]
  });

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
          this.totalPages.set(response.totalPages || 1);
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
        this.isSaving.set(false);
        this.toastService.success(`Veículo ${newVehicle.plate} cadastrado com sucesso!`);
        this.closeModal();
        this.currentPage.set(1);
        this.loadVehicles();
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

  sendMaintenanceForm: FormGroup = this.fb.group({
    type: ['CORRETIVA', [Validators.required]],
    description: ['', [Validators.required, Validators.minLength(3)]],
    serviceProvider: [''],
    scheduledDate: [''],
    startImmediately: [true],
  });

  // --- AÇÕES INTELIGENTES DE MANUTENÇÃO ---
  openMaintenanceAction(vehicle: Vehicle): void {
    this.selectedVehicle.set(vehicle);
    this.actionError.set(null);
    const existing = this.activeMaintenancesMap().get(vehicle.id);

    if (existing || this.isInMaintenance(vehicle)) {
      if (existing) {
        this.selectedMaintenanceForInfo.set(existing);
        this.isMaintenanceInfoModalOpen.set(true);
      } else {
        this.isActionLoading.set(true);
        this.maintenanceRepository.getAll({ vehicleId: vehicle.id, limit: 5 }).subscribe({
          next: (res) => {
            this.isActionLoading.set(false);
            const activeOrScheduled = res.data.find(m => m.status === 'EM_ANDAMENTO' || m.status === 'AGENDADA');
            if (activeOrScheduled) {
              this.selectedMaintenanceForInfo.set(activeOrScheduled);
              this.isMaintenanceInfoModalOpen.set(true);
            } else {
              this.openSendMaintenanceModal(vehicle);
            }
          },
          error: () => {
            this.isActionLoading.set(false);
            this.openSendMaintenanceModal(vehicle);
          }
        });
      }
    } else {
      this.openSendMaintenanceModal(vehicle);
    }
  }

  closeMaintenanceInfoModal(): void {
    this.isMaintenanceInfoModalOpen.set(false);
    this.selectedMaintenanceForInfo.set(null);
    this.selectedVehicle.set(null);
  }

  goToMaintenanceModule(vehicleId?: string): void {
    this.closeMaintenanceInfoModal();
    if (vehicleId) {
      this.router.navigate(['/manutencoes'], { queryParams: { vehicleId } });
    } else {
      this.router.navigate(['/manutencoes']);
    }
  }

  startScheduledMaintenanceFromModal(maintenance: Maintenance): void {
    const vehicle = this.selectedVehicle();
    this.isActionLoading.set(true);
    this.actionError.set(null);

    this.maintenanceRepository.start(maintenance.id, { startedAt: new Date().toISOString() }).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.toastService.success(`Manutenção iniciada! Veículo ${vehicle?.plate || ''} em manutenção.`);
        this.closeMaintenanceInfoModal();
        this.loadVehicles();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        const msg = err.error?.message || 'Erro ao iniciar manutenção agendada.';
        this.actionError.set(msg);
        this.toastService.error(msg);
      }
    });
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

  // --- AÇÕES: ENVIAR PARA MANUTENÇÃO ---
  openSendMaintenanceModal(vehicle: Vehicle): void {
    this.selectedVehicle.set(vehicle);
    this.actionError.set(null);
    this.sendMaintenanceForm.reset({
      type: 'CORRETIVA',
      description: '',
      serviceProvider: '',
      scheduledDate: '',
      startImmediately: true,
    });
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

    if (this.sendMaintenanceForm.invalid) {
      this.sendMaintenanceForm.markAllAsTouched();
      return;
    }

    this.isActionLoading.set(true);
    this.actionError.set(null);
    const formVal = this.sendMaintenanceForm.value;

    if (formVal.startImmediately) {
      this.maintenanceRepository
        .startDirect({
          vehicleId: vehicle.id,
          type: formVal.type,
          description: formVal.description,
          serviceProvider: formVal.serviceProvider || undefined,
          startedAt: new Date().toISOString(),
        })
        .subscribe({
          next: () => {
            this.isActionLoading.set(false);
            this.toastService.success(`Veículo ${vehicle.plate} enviado para manutenção com sucesso!`);
            this.closeSendMaintenanceModal();
            this.loadVehicles();
          },
          error: (err) => {
            this.isActionLoading.set(false);
            const msg = err.error?.message || 'Não foi possível enviar o veículo para manutenção.';
            this.actionError.set(msg);
            this.toastService.error(msg);
          },
        });
    } else {
      this.maintenanceRepository
        .create({
          vehicleId: vehicle.id,
          type: formVal.type,
          description: formVal.description,
          serviceProvider: formVal.serviceProvider || undefined,
          scheduledDate: formVal.scheduledDate || undefined,
        })
        .subscribe({
          next: () => {
            this.isActionLoading.set(false);
            this.toastService.success(`Manutenção agendada para o veículo ${vehicle.plate}!`);
            this.closeSendMaintenanceModal();
            this.loadVehicles();
          },
          error: (err) => {
            this.isActionLoading.set(false);
            const msg = err.error?.message || 'Não foi possível agendar a manutenção.';
            this.actionError.set(msg);
            this.toastService.error(msg);
          },
        });
    }
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

    // Busca se existe manutenção em andamento para fechar com chave de ouro
    this.maintenanceRepository
      .getAll({ vehicleId: vehicle.id, status: 'EM_ANDAMENTO', limit: 1 })
      .subscribe({
        next: (res) => {
          const activeMaintenance = res.data?.[0];
          if (activeMaintenance) {
            this.maintenanceRepository
              .finish(activeMaintenance.id, {
                odometerAtService: vehicle.currentKm,
                finishedAt: new Date().toISOString(),
              })
              .subscribe({
                next: () => {
                  this.isActionLoading.set(false);
                  this.toastService.success(`Manutenção finalizada! Veículo ${vehicle.plate} liberado.`);
                  this.closeFinishMaintenanceModal();
                  this.loadVehicles();
                },
                error: (err) => {
                  this.isActionLoading.set(false);
                  const msg = err.error?.message || 'Não foi possível finalizar a manutenção.';
                  this.actionError.set(msg);
                  this.toastService.error(msg);
                },
              });
          } else {
            // Fallback caso seja alteração legada de status direto
            this.vehicleRepository.finishMaintenance(vehicle.id).subscribe({
              next: () => {
                this.isActionLoading.set(false);
                this.toastService.success(`Manutenção finalizada! Veículo ${vehicle.plate} liberado.`);
                this.closeFinishMaintenanceModal();
                this.loadVehicles();
              },
              error: (err) => {
                this.isActionLoading.set(false);
                const msg = err.error?.message || 'Não foi possível finalizar a manutenção.';
                this.actionError.set(msg);
                this.toastService.error(msg);
              },
            });
          }
        },
        error: () => {
          this.vehicleRepository.finishMaintenance(vehicle.id).subscribe({
            next: () => {
              this.isActionLoading.set(false);
              this.toastService.success(`Manutenção finalizada! Veículo ${vehicle.plate} liberado.`);
              this.closeFinishMaintenanceModal();
              this.loadVehicles();
            },
            error: (err) => {
              this.isActionLoading.set(false);
              const msg = err.error?.message || 'Não foi possível finalizar a manutenção.';
              this.actionError.set(msg);
              this.toastService.error(msg);
            },
          });
        },
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
      next: () => {
        this.isActionLoading.set(false);
        this.toastService.success(`Quilometragem do veículo ${vehicle.plate} atualizada para ${newKm} km!`);
        this.closeUpdateKmModal();
        this.loadVehicles();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        const msg = err.error?.message || 'Não foi possível atualizar a quilometragem.';
        this.actionError.set(msg);
        this.toastService.error(msg);
      }
    });
  }

  // --- AÇÕES: ATUALIZAR / RENOVAR CRLV ---
  openUpdateCrlvModal(vehicle: Vehicle): void {
    this.selectedVehicle.set(vehicle);
    this.actionError.set(null);
    let dateStr = '';
    if (vehicle.crlvExpiration) {
      try {
        const d = new Date(vehicle.crlvExpiration);
        dateStr = d.toISOString().split('T')[0];
      } catch {
        dateStr = '';
      }
    }
    this.updateCrlvForm.reset({
      crlvExpiration: dateStr
    });
    this.isUpdateCrlvModalOpen.set(true);
  }

  closeUpdateCrlvModal(): void {
    this.isUpdateCrlvModalOpen.set(false);
    this.actionError.set(null);
  }

  confirmUpdateCrlv(): void {
    const vehicle = this.selectedVehicle();
    if (!vehicle) return;

    if (this.updateCrlvForm.invalid) {
      this.updateCrlvForm.markAllAsTouched();
      this.toastService.error('Informe uma data de vencimento válida.');
      return;
    }

    const newDate = this.updateCrlvForm.value.crlvExpiration;
    this.isActionLoading.set(true);
    this.actionError.set(null);

    this.vehicleRepository.updateCrlv(vehicle.id, newDate).subscribe({
      next: (updatedVehicle) => {
        this.isActionLoading.set(false);
        this.toastService.success(`Vencimento do CRLV do veículo ${vehicle.plate} atualizado com sucesso!`);
        this.closeUpdateCrlvModal();
        if (this.isDetailsModalOpen() && this.selectedVehicle()?.id === vehicle.id) {
          this.selectedVehicle.set(updatedVehicle);
        }
        this.loadVehicles();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        const msg = err.error?.message || 'Não foi possível atualizar o vencimento do CRLV.';
        this.actionError.set(msg);
        this.toastService.error(msg);
      }
    });
  }

  // --- AÇÕES: FICHA / DETALHES DO VEÍCULO ---
  openDetailsModal(vehicle: Vehicle): void {
    this.selectedVehicle.set(vehicle);
    this.activeDetailsTab.set('OVERVIEW');
    this.isDetailsModalOpen.set(true);
    this.loadVehicleMaintenances(vehicle.id);
    this.loadVehicleFuelRecords(vehicle.id);
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedVehicle.set(null);
    this.vehicleMaintenances.set([]);
    this.vehicleFuelRecords.set([]);
  }

  setDetailsTab(tab: 'OVERVIEW' | 'MAINTENANCE' | 'FUEL'): void {
    this.activeDetailsTab.set(tab);
  }

  loadVehicleMaintenances(vehicleId: string): void {
    this.isLoadingMaintenances.set(true);
    this.maintenanceRepository.getAll({ vehicleId, limit: 100 }).subscribe({
      next: (res) => {
        this.vehicleMaintenances.set(res.data);
        this.isLoadingMaintenances.set(false);
      },
      error: () => {
        this.isLoadingMaintenances.set(false);
      }
    });
  }

  loadVehicleFuelRecords(vehicleId: string): void {
    this.isLoadingFuelRecords.set(true);
    this.fuelRepository.list({ vehicleId, limit: 100 }).subscribe({
      next: (res) => {
        this.vehicleFuelRecords.set(res.data);
        this.isLoadingFuelRecords.set(false);
      },
      error: () => {
        this.isLoadingFuelRecords.set(false);
      }
    });
  }

  getMaintenanceStatusClass(status: MaintenanceStatus): string {
    switch (status) {
      case 'AGENDADA':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'EM_ANDAMENTO':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CONCLUIDA':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELADA':
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  }

  getMaintenanceStatusLabel(status: MaintenanceStatus): string {
    switch (status) {
      case 'AGENDADA':
        return 'Agendada';
      case 'EM_ANDAMENTO':
        return 'Em Andamento';
      case 'CONCLUIDA':
        return 'Concluída';
      case 'CANCELADA':
        return 'Cancelada';
    }
  }

  getMaintenanceTypeClass(type: MaintenanceType): string {
    return type === 'PREVENTIVA'
      ? 'bg-purple-50 text-purple-700 border-purple-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';
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

  // ==========================================
  // --- FLUXO DE IMPORTAÇÃO DE VEÍCULOS CSV ---
  // ==========================================

  openImportModal(): void {
    this.selectedFile.set(null);
    this.importResult.set(null);
    this.importErrorMessage.set(null);
    this.isImporting.set(false);
    this.isDragging.set(false);
    this.isImportModalOpen.set(true);
  }

  closeImportModal(): void {
    const hasSuccess = (this.importResult()?.importadosComSucesso ?? 0) > 0;
    this.isImportModalOpen.set(false);
    this.selectedFile.set(null);
    this.importResult.set(null);
    this.importErrorMessage.set(null);
    this.isImporting.set(false);
    this.isDragging.set(false);

    if (hasSuccess) {
      this.loadVehicles();
    }
  }

  downloadTemplateCsv(): void {
    const csvContent =
      'placa,marca,modelo,ano,km,vencimento_crlv\r\n' +
      'ABC1D23,Volvo,FH 540,2023,15000,31/12/2026\r\n' +
      'XYZ9876,Scania,R450,2022,45000,15/10/2026\r\n' +
      'BRA2E19,Mercedes-Benz,Actros 2651,2024,8000,\r\n' +
      'KLD9012,DAF,XF 530,2021,95000,20/08/2026\r\n';

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo-importacao-veiculos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.toastService.success('Planilha modelo (.csv) baixada com sucesso!');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  processFile(file: File): void {
    this.importErrorMessage.set(null);
    this.importResult.set(null);

    // Valida extensão .csv
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.importErrorMessage.set('Por favor, selecione um arquivo válido com extensão .csv.');
      this.toastService.error('Formato inválido! Envie um arquivo .csv.');
      return;
    }

    // Valida tamanho máximo de 5MB
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      this.importErrorMessage.set('O arquivo selecionado excede o limite máximo permitido de 5MB.');
      this.toastService.error('Arquivo muito grande! Máximo de 5MB.');
      return;
    }

    this.selectedFile.set(file);
  }

  removeSelectedFile(): void {
    this.selectedFile.set(null);
    this.importResult.set(null);
    this.importErrorMessage.set(null);
  }

  executeImport(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.isImporting.set(true);
    this.importErrorMessage.set(null);
    this.importResult.set(null);

    this.vehicleRepository.importCsv(file).subscribe({
      next: (result) => {
        this.isImporting.set(false);
        this.importResult.set(result);

        if (result.importadosComSucesso > 0 && result.erros.length === 0) {
          this.toastService.success(`Sucesso! ${result.importadosComSucesso} veículos foram importados.`);
        } else if (result.importadosComSucesso > 0 && result.erros.length > 0) {
          this.toastService.warning(
            `${result.importadosComSucesso} veículos importados com sucesso, mas ${result.erros.length} linha(s) tiveram problemas.`
          );
        } else {
          this.toastService.error('Nenhum veículo foi importado. Verifique os erros apontados no relatório.');
        }

        // Se ao menos 1 veículo foi importado, recarrega a lista ao fundo
        if (result.importadosComSucesso > 0) {
          this.loadVehicles();
        }
      },
      error: (err) => {
        this.isImporting.set(false);
        const msg =
          err.error?.message ||
          'Ocorreu um erro ao processar o arquivo CSV. Verifique a estrutura das colunas e tente novamente.';
        this.importErrorMessage.set(msg);
        this.toastService.error(msg);
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
}
