import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IDriverRepository } from '../../domain/repositories/driver.repository.interface';
import { Driver, CnhCategory } from '../../domain/models/driver.model';
import {
  LucideUsers,
  LucidePlus,
  LucideSearch,
  LucideLoader2,
  LucideX,
  LucideAlertTriangle,
  LucideCheckCircle2,
  LucidePhone,
  LucideIdCard
} from '@lucide/angular';

@Component({
  selector: 'app-driver-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideUsers,
    LucidePlus,
    LucideLoader2,
    LucideX,
    LucideAlertTriangle,
    LucidePhone,
  ],
  templateUrl: './driver-list.html',
  styleUrl: './driver-list.css'
})
export class DriverListComponent implements OnInit {
  private readonly driverRepository = inject(IDriverRepository);
  private readonly fb = inject(FormBuilder);

  drivers = signal<Driver[]>([]);
  loading = signal<boolean>(true);
  isModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  cnhCategories: CnhCategory[] = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];

  driverForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    cpf: ['', [Validators.required, Validators.pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/)]],
    phone: ['', [Validators.required]],
    cnhNumber: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    cnhCategory: ['D', [Validators.required]],
    cnhExpiration: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.loadDrivers();
  }

  loadDrivers(): void {
    this.loading.set(true);
    this.driverRepository.getAll().subscribe({
      next: (data) => {
        this.drivers.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openModal(): void {
    this.driverForm.reset({ cnhCategory: 'D' });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  getCnhNumber(driver: Driver): string {
    return driver.cnh?.number || driver.cnhNumber || '-';
  }

  getCnhCategory(driver: Driver): string {
    return driver.cnh?.category || driver.cnhCategory || '-';
  }

  getCnhExpiration(driver: Driver): string {
    return driver.cnh?.expirationDate || driver.cnhExpiration || '';
  }

  isCnhExpired(expirationDateStr: string): boolean {
    if (!expirationDateStr) return false;
    const expirationDate = new Date(expirationDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expirationDate < today;
  }

  isCnhExpiringSoon(expirationDateStr: string): boolean {
    if (!expirationDateStr) return false;
    const expirationDate = new Date(expirationDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }

  getDriverStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE':
      case 'DISPONIVEL':
        return 'Ativo';
      case 'INACTIVE':
      case 'FOLGA':
        return 'Inativo';
      case 'SUSPENDED':
      case 'AFASTADO':
        return 'Suspenso';
      case 'EM_VIAGEM':
        return 'Em viagem';
      default:
        return status || 'Ativo';
    }
  }

  getDriverStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
      case 'DISPONIVEL':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
      case 'EM_VIAGEM':
        return 'bg-blue-50 text-blue-700 border-blue-200/70';
      case 'INACTIVE':
      case 'FOLGA':
        return 'bg-amber-50 text-amber-700 border-amber-200/70';
      case 'SUSPENDED':
      case 'AFASTADO':
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200/70';
    }
  }

  getDriverStatusDotClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
      case 'DISPONIVEL':
        return 'bg-emerald-500';
      case 'EM_VIAGEM':
        return 'bg-blue-500';
      case 'INACTIVE':
      case 'FOLGA':
        return 'bg-amber-500';
      case 'SUSPENDED':
      case 'AFASTADO':
      default:
        return 'bg-rose-500';
    }
  }

  saveDriver(): void {
    if (this.driverForm.invalid) {
      this.driverForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formValue = this.driverForm.value;

    const payload = {
      name: formValue.name,
      cpf: formValue.cpf.replace(/\D/g, ''),
      cnhNumber: formValue.cnhNumber,
      cnhCategory: formValue.cnhCategory,
      cnhExpirationDate: formValue.cnhExpiration,
      phone: formValue.phone,
    };

    this.driverRepository.create(payload as any).subscribe({
      next: (newDriver) => {
        this.drivers.update((list) => [newDriver, ...list]);
        this.isSaving.set(false);
        this.closeModal();
      },
      error: () => this.isSaving.set(false)
    });
  }
}
