import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ITripRepository } from '../../domain/repositories/trip.repository.interface';
import { IVehicleRepository } from '../../domain/repositories/vehicle.repository.interface';
import { IDriverRepository } from '../../domain/repositories/driver.repository.interface';
import { ToastService } from '../../core/services/toast.service';
import { Trip, FuelSupply } from '../../domain/models/trip.model';
import { Vehicle } from '../../domain/models/vehicle.model';
import { Driver } from '../../domain/models/driver.model';
import {
  LucideNavigation,
  LucidePlus,
  LucideLoader2,
  LucideX,
  LucideFuel,
  LucideCheckCircle2,
  LucideMapPin,
  LucideTruck,
  LucideUser,
  LucideAlertCircle,
} from '@lucide/angular';

@Component({
  selector: 'app-trip-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideNavigation,
    LucidePlus,
    LucideLoader2,
    LucideX,
    LucideFuel,
    LucideMapPin,
    LucideTruck,
    LucideUser,
    LucideAlertCircle,
    LucideCheckCircle2,
  ],
  templateUrl: './trip-list.html',
  styleUrl: './trip-list.css'
})
export class TripListComponent implements OnInit {
  private readonly tripRepository = inject(ITripRepository);
  private readonly vehicleRepository = inject(IVehicleRepository);
  private readonly driverRepository = inject(IDriverRepository);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  trips = signal<Trip[]>([]);
  vehicles = signal<Vehicle[]>([]);
  drivers = signal<Driver[]>([]);
  loading = signal<boolean>(true);

  // Estados dos Modais e Requisições
  isTripModalOpen = signal<boolean>(false);
  isSupplyModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  selectedTripId = signal<string | null>(null);

  readonly states = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  // Formulário de Cadastro de Viagem alinhado ao backend
  tripForm: FormGroup = this.fb.group({
    vehicleId: ['', [Validators.required]],
    driverId: ['', [Validators.required]],
    originAddress: ['', [Validators.required, Validators.minLength(3)]],
    originCity: ['', [Validators.required]],
    originState: ['PA', [Validators.required, Validators.maxLength(2)]],
    destinationAddress: ['', [Validators.required, Validators.minLength(3)]],
    destinationCity: ['', [Validators.required]],
    destinationState: ['PA', [Validators.required, Validators.maxLength(2)]],
  });

  supplyForm: FormGroup = this.fb.group({
    liters: [0, [Validators.required, Validators.min(1)]],
    totalValue: [0, [Validators.required, Validators.min(1)]],
    fuelType: ['DIESEL', [Validators.required]],
    odometer: [0, [Validators.required, Validators.min(0)]],
    date: [new Date().toISOString().substring(0, 10), [Validators.required]]
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.tripRepository.getAll().subscribe({
      next: (data) => {
        this.trips.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toastService.error('Erro ao carregar lista de viagens.');
      }
    });

    this.vehicleRepository.getAll().subscribe((v) => this.vehicles.set(v));
    this.driverRepository.getAll().subscribe((d) => this.drivers.set(d));
  }

  getVehiclePlate(vehicleId: string): string {
    const v = this.vehicles().find((item) => item.id === vehicleId);
    return v ? `${v.plate} (${v.model})` : 'Veículo ' + vehicleId.slice(0, 8);
  }

  getDriverName(driverId: string): string {
    const d = this.drivers().find((item) => item.id === driverId);
    return d ? d.name : 'Motorista ' + driverId.slice(0, 8);
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PLANNED':
      case 'PROGRAMADA':
        return 'Programada';
      case 'IN_PROGRESS':
      case 'EM_ANDAMENTO':
        return 'Em Andamento';
      case 'COMPLETED':
      case 'CONCLUIDA':
        return 'Concluída';
      case 'CANCELLED':
      case 'CANCELADA':
        return 'Cancelada';
      default:
        return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'IN_PROGRESS':
      case 'EM_ANDAMENTO':
        return 'bg-blue-50 text-blue-700 border-blue-200/70';
      case 'COMPLETED':
      case 'CONCLUIDA':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
      case 'PLANNED':
      case 'PROGRAMADA':
        return 'bg-amber-50 text-amber-700 border-amber-200/70';
      case 'CANCELLED':
      case 'CANCELADA':
        return 'bg-rose-50 text-rose-700 border-rose-200/70';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200/70';
    }
  }

  getStatusDotClass(status: string): string {
    switch (status) {
      case 'IN_PROGRESS':
      case 'EM_ANDAMENTO':
        return 'bg-blue-500';
      case 'COMPLETED':
      case 'CONCLUIDA':
        return 'bg-emerald-500';
      case 'PLANNED':
      case 'PROGRAMADA':
        return 'bg-amber-500';
      case 'CANCELLED':
      case 'CANCELADA':
        return 'bg-rose-500';
      default:
        return 'bg-slate-500';
    }
  }

  openTripModal(): void {
    this.errorMessage.set(null);
    this.tripForm.reset({
      originState: 'PA',
      destinationState: 'PA',
      vehicleId: '',
      driverId: '',
      originAddress: '',
      originCity: '',
      destinationAddress: '',
      destinationCity: ''
    });
    this.isTripModalOpen.set(true);
  }

  closeTripModal(): void {
    this.isTripModalOpen.set(false);
    this.errorMessage.set(null);
  }

  openSupplyModal(tripId: string): void {
    this.selectedTripId.set(tripId);
    this.supplyForm.reset({
      fuelType: 'DIESEL',
      date: new Date().toISOString().substring(0, 10),
      liters: 0,
      totalValue: 0,
      odometer: 0
    });
    this.isSupplyModalOpen.set(true);
  }

  closeSupplyModal(): void {
    this.isSupplyModalOpen.set(false);
    this.selectedTripId.set(null);
  }

  saveTrip(): void {
    this.errorMessage.set(null);

    if (this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();
      this.toastService.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    this.isSaving.set(true);
    const formValue = this.tripForm.value;

    const payload = {
      driverId: formValue.driverId,
      vehicleId: formValue.vehicleId,
      origin: {
        address: formValue.originAddress?.trim(),
        city: formValue.originCity?.trim(),
        state: formValue.originState?.trim().toUpperCase(),
      },
      destination: {
        address: formValue.destinationAddress?.trim(),
        city: formValue.destinationCity?.trim(),
        state: formValue.destinationState?.trim().toUpperCase(),
      }
    };

    this.tripRepository.create(payload).subscribe({
      next: (newTrip) => {
        this.trips.update((list) => [newTrip, ...list]);
        this.isSaving.set(false);
        this.toastService.success('Viagem criada com sucesso!');
        this.closeTripModal();
      },
      error: (err) => {
        this.isSaving.set(false);
        let msg = 'Erro ao criar viagem. Verifique os dados informados.';
        if (err.error?.message) {
          msg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.errorMessage.set(msg);
        this.toastService.error(`Falha ao criar viagem: ${msg}`);
      }
    });
  }

  saveFuelSupply(): void {
    if (this.supplyForm.invalid || !this.selectedTripId()) {
      this.supplyForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const dto = {
      ...this.supplyForm.value,
      tripId: this.selectedTripId()!
    };

    this.tripRepository.addFuelSupply(dto).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastService.success('Abastecimento registrado com sucesso!');
        this.closeSupplyModal();
        this.loadData();
      },
      error: (err) => {
        this.isSaving.set(false);
        let msg = 'Erro ao registrar abastecimento.';
        if (err.error?.message) {
          msg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.toastService.error(msg);
      }
    });
  }
}

