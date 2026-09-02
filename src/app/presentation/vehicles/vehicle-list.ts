import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { IVehicleRepository } from '../../domain/repositories/vehicle.repository.interface';
import { Vehicle } from '../../domain/models/vehicle.model';
import {
  LucideTruck,
  LucidePlus,
  LucideSearch,
  LucideLoader2,
  LucideX,
  LucideWrench,
  LucideCheckCircle2,
  LucideXCircle
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
    LucideWrench,
    LucideCheckCircle2,
    LucideXCircle
  ],
  templateUrl: './vehicle-list.html',
  styleUrl: './vehicle-list.css'
})
export class VehicleListComponent implements OnInit {
  private readonly vehicleRepository = inject(IVehicleRepository);
  private readonly fb = inject(FormBuilder);

  vehicles = signal<Vehicle[]>([]);
  loading = signal<boolean>(true);
  isModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);

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
        vehicle.brand.toLowerCase().includes(term);

      const matchesStatus = status === 'ALL' || vehicle.status === status;

      return matchesSearch && matchesStatus;
    });
  });

  vehicleForm: FormGroup = this.fb.group({
    plate: ['', [Validators.required, Validators.pattern(/^[A-Z]{3}-[0-9][A-Z0-9][0-9]{2}$/i)]],
    brand: ['', [Validators.required]],
    model: ['', [Validators.required]],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(1990)]],
    mileage: [0, [Validators.required, Validators.min(0)]],
    crlvExpiration: ['', [Validators.required]]
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
      error: () => this.loading.set(false)
    });
  }

  setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
  }

  openModal(): void {
    this.vehicleForm.reset({ year: new Date().getFullYear(), mileage: 0 });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  saveVehicle(): void {
    if (this.vehicleForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formValue = this.vehicleForm.value;

    this.vehicleRepository.create(formValue).subscribe({
      next: (newVehicle) => {
        this.vehicles.update((list) => [newVehicle, ...list]);
        this.isSaving.set(false);
        this.closeModal();
      },
      error: () => this.isSaving.set(false)
    });
  }
}
