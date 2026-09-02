import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
