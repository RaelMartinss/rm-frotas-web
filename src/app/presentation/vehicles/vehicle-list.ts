import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { IVehicleRepository } from '../../domain/repositories/vehicle.repository.interface';
import { ToastService } from '../../core/services/toast.service';
import { Vehicle } from '../../domain/models/vehicle.model';
import {
  LucideTruck,
  LucidePlus,
  LucideSearch,
  LucideLoader2,
  LucideX,
  LucideAlertCircle
} from '@lucide/angular';

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideTruck,
    LucidePlus,
    LucideSearch,
    LucideLoader2,
    LucideX,
    LucideAlertCircle
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
  isModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

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

  ngOnInit(): void {
    this.loadVehicles();
  }

  loadVehicles(): void {
    this.loading.set(true);
    this.vehicleRepository.getAll().subscribe({
      next: (data) => {
        this.vehicles.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toastService.error('Erro ao carregar lista de veículos.');
      }
    });
  }

  setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
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
}

