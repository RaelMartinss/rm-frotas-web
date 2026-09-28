import { Component, inject, OnInit, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { IDriverPortalRepository } from '../../../domain/repositories/driver-portal.repository.interface';
import { DriverPortalSummary } from '../../../domain/models/driver-portal.model';
import { ToastService } from '../../../core/services/toast.service';
import { compressImage } from '../../../core/utils/image-compressor';
import {
  LucideArrowLeft,
  LucideFuel,
  LucideTruck,
  LucideCamera,
  LucideImage,
  LucideTrash2,
  LucideCheck,
  LucideLoader2,
  LucideAlertCircle,
  LucideGauge,
  LucideDollarSign,
  LucideMapPin,
  LucideFileText,
} from '@lucide/angular';

@Component({
  selector: 'app-driver-fuel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideArrowLeft,
    LucideFuel,
    LucideTruck,
    LucideCamera,
    LucideImage,
    LucideTrash2,
    LucideCheck,
    LucideLoader2,
    LucideAlertCircle,
    LucideGauge,
    LucideDollarSign,
    LucideMapPin,
    LucideFileText,
  ],
  templateUrl: './driver-fuel.html',
})
export class DriverFuelComponent implements OnInit {
  private readonly portalRepository = inject(IDriverPortalRepository);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  @ViewChild('cameraInput') cameraInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('galleryInput') galleryInputRef!: ElementRef<HTMLInputElement>;

  readonly summary = signal<DriverPortalSummary | null>(null);
  readonly loadingSummary = signal<boolean>(true);
  readonly saving = signal<boolean>(false);
  readonly isProcessingPhoto = signal<boolean>(false);

  // Campos do formulário
  readonly fuelKm = signal<number | null>(null);
  readonly fuelLiters = signal<number | null>(null);
  readonly fuelPricePerLiter = signal<number | null>(null);
  readonly fuelType = signal<string>('DIESEL');
  readonly fuelGasStation = signal<string>('');
  readonly fuelFullTank = signal<boolean>(true);
  readonly fuelNotes = signal<string>('');
  readonly receiptPhoto = signal<string | null>(null);

  // Veículo ativo
  readonly vehicle = computed(() => this.summary()?.trip?.vehicle || null);
  readonly trip = computed(() => this.summary()?.trip || null);

  // Total estimado em reais
  readonly estimatedTotal = computed(() => {
    const liters = this.fuelLiters();
    const price = this.fuelPricePerLiter();
    if (liters && price && liters > 0 && price > 0) {
      return liters * price;
    }
    return 0;
  });

  // Alerta de KM inferior
  readonly isKmLowerThanVehicle = computed(() => {
    const v = this.vehicle();
    const current = this.fuelKm();
    if (v && v.currentKm && current && current < v.currentKm) {
      return true;
    }
    return false;
  });

  ngOnInit(): void {
    this.loadTripData();
  }

  loadTripData(): void {
    this.loadingSummary.set(true);
    this.portalRepository.getCurrentTrip().subscribe({
      next: (data) => {
        this.summary.set(data);
        if (data.trip?.vehicle?.currentKm) {
          this.fuelKm.set(data.trip.vehicle.currentKm);
        }
        this.loadingSummary.set(false);
      },
      error: () => {
        this.loadingSummary.set(false);
      },
    });
  }

  setFuelType(type: string): void {
    this.fuelType.set(type);
  }

  triggerCamera(): void {
    this.cameraInputRef?.nativeElement?.click();
  }

  triggerGallery(): void {
    this.galleryInputRef?.nativeElement?.click();
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    try {
      this.isProcessingPhoto.set(true);
      const compressed = await compressImage(file, 1280, 1280, 0.75);
      this.receiptPhoto.set(compressed);
      this.isProcessingPhoto.set(false);
      this.toastService.success('Foto do comprovante anexada!');
    } catch {
      this.isProcessingPhoto.set(false);
      this.toastService.error('Erro ao processar imagem. Tente novamente.');
    } finally {
      input.value = '';
    }
  }

  removePhoto(): void {
    this.receiptPhoto.set(null);
    this.toastService.info('Foto removida.');
  }

  async saveFuelRecord(): Promise<void> {
    const v = this.vehicle();
    const vehicleId = v?.id;

    if (!vehicleId) {
      this.toastService.error('Nenhum veículo vinculado à sua viagem ativa.');
      return;
    }

    const km = this.fuelKm();
    const liters = this.fuelLiters();
    const price = this.fuelPricePerLiter();

    if (!km || km <= 0) {
      this.toastService.error('Informe o KM do odômetro do veículo.');
      return;
    }

    if (!liters || liters <= 0) {
      this.toastService.error('Informe a quantidade de litros abastecida.');
      return;
    }

    if (!price || price <= 0) {
      this.toastService.error('Informe o preço por litro pago.');
      return;
    }

    this.saving.set(true);

    this.portalRepository
      .registerFuel({
        vehicleId,
        currentKm: km,
        liters,
        pricePerLiter: price,
        fuelType: this.fuelType(),
        gasStation: this.fuelGasStation().trim() || undefined,
        fullTank: this.fuelFullTank(),
        notes: this.fuelNotes().trim() || undefined,
        receiptUrl: this.receiptPhoto() || undefined,
      })
      .subscribe({
        next: async (res) => {
          this.saving.set(false);
          try {
            await Haptics.impact({ style: ImpactStyle.Medium });
          } catch {}

          this.toastService.success(`Abastecimento de R$ ${res.totalCost.toFixed(2)} registrado com sucesso!`);
          this.router.navigate(['/motorista']);
        },
        error: (err) => {
          this.saving.set(false);
          this.toastService.error(err?.error?.message || 'Falha ao registrar abastecimento. Verifique sua conexão.');
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/motorista']);
  }
}
