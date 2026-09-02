import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ITripRepository } from '../../domain/repositories/trip.repository.interface';
import { IVehicleRepository } from '../../domain/repositories/vehicle.repository.interface';
import { IDriverRepository } from '../../domain/repositories/driver.repository.interface';
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
  LucideUser
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
    LucideCheckCircle2,
    LucideMapPin,
    LucideTruck,
    LucideUser
  ],
  templateUrl: './trip-list.html',
  styleUrl: './trip-list.css'
})
export class TripListComponent implements OnInit {
  private readonly tripRepository = inject(ITripRepository);
  private readonly vehicleRepository = inject(IVehicleRepository);
  private readonly driverRepository = inject(IDriverRepository);
  private readonly fb = inject(FormBuilder);

  trips = signal<Trip[]>([]);
  vehicles = signal<Vehicle[]>([]);
  drivers = signal<Driver[]>([]);
  loading = signal<boolean>(true);

  // Controle dos Modais
  isTripModalOpen = signal<boolean>(false);
  isSupplyModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  selectedTripId = signal<string | null>(null);

  // Formulários Reativos
  tripForm: FormGroup = this.fb.group({
    vehicleId: ['', [Validators.required]],
    driverId: ['', [Validators.required]],
    origin: ['', [Validators.required]],
    destination: ['', [Validators.required]],
    departureDate: ['', [Validators.required]],
    initialOdometer: [0, [Validators.required, Validators.min(0)]]
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
      error: () => this.loading.set(false)
    });

    this.vehicleRepository.getAll().subscribe((v) => this.vehicles.set(v));
    this.driverRepository.getAll().subscribe((d) => this.drivers.set(d));
  }

  openTripModal(): void {
    this.tripForm.reset({ initialOdometer: 0 });
    this.isTripModalOpen.set(true);
  }

  closeTripModal(): void {
    this.isTripModalOpen.set(false);
  }

  openSupplyModal(tripId: string): void {
    this.selectedTripId.set(tripId);
    this.supplyForm.reset({
      fuelType: 'DIESEL',
      date: new Date().toISOString().substring(0, 10)
    });
    this.isSupplyModalOpen.set(true);
  }

  closeSupplyModal(): void {
    this.isSupplyModalOpen.set(false);
    this.selectedTripId.set(null);
  }

  saveTrip(): void {
    if (this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.tripRepository.create(this.tripForm.value).subscribe({
      next: (newTrip) => {
        this.trips.update((list) => [newTrip, ...list]);
        this.isSaving.set(false);
        this.closeTripModal();
      },
      error: () => this.isSaving.set(false)
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
        this.closeSupplyModal();
        this.loadData();
      },
      error: () => this.isSaving.set(false)
    });
  }
}
