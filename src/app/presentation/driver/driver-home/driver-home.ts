import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { IDriverPortalRepository } from '../../../domain/repositories/driver-portal.repository.interface';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { LocationTrackingService } from '../../../core/services/location-tracking.service';
import { DriverNotificationService } from '../../../core/services/driver-notification.service';
import {
  DriverPortalSummary,
  DriverCurrentTrip,
} from '../../../domain/models/driver-portal.model';
import { compressImage } from '../../../core/utils/image-compressor';
import { getDocumentExpirationStatus } from '../../../core/utils/document-expiration.util';
import {
  LucideNavigation,
  LucideFuel,
  LucideAlertTriangle,
  LucideTruck,
  LucideFileText,
  LucideCheckCircle2,
  LucideRefreshCw,
  LucideMapPin,
  LucideCamera,
  LucideX,
  LucideShieldAlert,
  LucideWifiOff,
  LucideCheckSquare,
  LucideRadio,
  LucidePhoneCall,
} from '@lucide/angular';

@Component({
  selector: 'app-driver-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideNavigation,
    LucideFuel,
    LucideAlertTriangle,
    LucideTruck,
    LucideFileText,
    LucideCheckCircle2,
    LucideRefreshCw,
    LucideMapPin,
    LucideCamera,
    LucideX,
    LucideShieldAlert,
    LucideWifiOff,
    LucideCheckSquare,
    LucideRadio,
    LucidePhoneCall,
  ],
  templateUrl: './driver-home.html',
})
export class DriverHomeComponent implements OnInit, OnDestroy {
  private readonly portalRepository = inject(IDriverPortalRepository);
  private readonly networkService = inject(NetworkStatusService);
  readonly locationTracking = inject(LocationTrackingService);
  private readonly notificationService = inject(DriverNotificationService);
  private pollSubscription: Subscription | null = null;

  readonly data = signal<DriverPortalSummary | null>(null);
  readonly loading = signal<boolean>(true);
  readonly refreshing = signal<boolean>(false);
  readonly actionLoading = signal<boolean>(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly isOnline = computed(() => this.networkService.isOnline());

  readonly cnhStatus = computed(() => {
    const driver = this.data()?.driver;
    if (!driver) {
      return getDocumentExpirationStatus(null);
    }
    return getDocumentExpirationStatus(
      driver.cnhExpirationDateIso || driver.cnhExpirationDate,
      new Date(),
      driver.daysUntilCnhExpires,
    );
  });

  // Modais de Ação Rápida
  readonly startTripModalOpen = signal<boolean>(false);
  readonly completeTripModalOpen = signal<boolean>(false);
  readonly fuelModalOpen = signal<boolean>(false);
  readonly incidentModalOpen = signal<boolean>(false);
  readonly docsModalOpen = signal<boolean>(false);
  readonly checklistModalOpen = signal<boolean>(false);

  // Modelos de Formulário
  completeKm = signal<number | null>(null);

  // Formulário de Abastecimento
  fuelLiters = signal<number | null>(null);
  fuelPricePerLiter = signal<number | null>(null);
  fuelType = signal<string>('DIESEL');
  fuelKm = signal<number | null>(null);
  fuelGasStation = signal<string>('');
  fuelFullTank = signal<boolean>(true);
  fuelNotes = signal<string>('');
  fuelReceiptPhoto = signal<string | null>(null);

  // Central de Atendimento / SOS
  readonly centralPhone = '0800 763 7682';
  readonly centralPhoneHref = 'tel:08007637682';

  // Formulário e Etapas de Incidente / SOS
  readonly incidentStep = signal<'FORM' | 'SUCCESS'>('FORM');
  incidentCategory = signal<string>('PNEU');
  incidentDescription = signal<string>('');
  incidentPhoto = signal<string | null>(null);
  incidentGps = signal<{ latitude: number; longitude: number } | null>(null);
  isDetectingGps = signal<boolean>(false);
  lastSubmittedIncident = signal<{
    protocol?: string;
    category: string;
    description?: string;
    recordedAt?: string;
    latitude?: number;
    longitude?: number;
    locationAddress?: string;
    photoUrl?: string;
  } | null>(null);

  // Checklist
  checklistPneus = signal<boolean>(false);
  checklistOleo = signal<boolean>(false);
  checklistLuzes = signal<boolean>(false);
  checklistFreios = signal<boolean>(false);

  ngOnInit(): void {
    this.loadData();
    this.notificationService.syncPushTokenWithBackend();
    // Polling reativo em tempo real a cada 6 segundos para detectar novas viagens criadas pelo gestor
    this.pollSubscription = interval(6000).subscribe(() => {
      if (this.networkService.isOnline()) {
        this.loadData(false, true);
      }
    });
  }

  ngOnDestroy(): void {
    // NOTA: O rastreamento de localização não deve ser interrompido aqui porque o motorista
    // pode navegar entre as abas do app (ex: Cockpit e Histórico) durante uma viagem em andamento.
    // O rastreamento inicia no início da viagem e finaliza exclusivamente na conclusão/cancelamento ou logout.
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = null;
    }
  }

  loadData(isRefresh = false, isSilent = false): void {
    if (isRefresh) {
      this.refreshing.set(true);
    } else if (!isSilent && !this.data()) {
      this.loading.set(true);
    }
    this.errorMessage.set(null);

    this.portalRepository.getCurrentTrip().subscribe({
      next: (summary) => {
        this.data.set(summary);
        this.loading.set(false);
        this.refreshing.set(false);

        // Dispara verificações de notificações locais e mudanças de status
        this.notificationService.checkTripUpdates(summary.trip ?? null);
        this.notificationService.checkPendingReceipts(summary.pendingReceiptsCount ?? 0);
        this.notificationService.checkCnhExpiration(summary.driver ?? null);

        // Preenche sugestão de KM atual
        if (summary.trip?.vehicle?.currentKm) {
          this.completeKm.set(summary.trip.vehicle.currentKm);
          this.fuelKm.set(summary.trip.vehicle.currentKm);
        }

        // Inicia ou para o rastreamento conforme o status da viagem
        if (summary.trip?.status === 'IN_PROGRESS' || summary.trip?.status === 'EM_ANDAMENTO') {
          this.locationTracking.startTracking(summary.trip.id);
        } else {
          this.locationTracking.stopTracking();
        }
      },
      error: () => {
        if (!isSilent) {
          this.errorMessage.set('Não foi possível atualizar os dados da viagem.');
        }
        this.loading.set(false);
        this.refreshing.set(false);
      },
    });
  }

  // --- 1. Iniciar Viagem ---
  openStartTripModal(): void {
    if (!this.cnhStatus().canStartTrip) {
      this.errorMessage.set(
        this.cnhStatus().blockReason ||
          'Início de viagem bloqueado: CNH do motorista vencida ou a 1 dia do vencimento.',
      );
      return;
    }
    this.startTripModalOpen.set(true);
  }

  confirmStartTrip(): void {
    if (!this.cnhStatus().canStartTrip) {
      this.errorMessage.set(
        this.cnhStatus().blockReason ||
          'Início de viagem bloqueado: CNH do motorista vencida ou a 1 dia do vencimento.',
      );
      return;
    }
    const trip = this.data()?.trip;
    if (!trip) return;

    this.actionLoading.set(true);
    this.portalRepository.startTrip({ tripId: trip.id }).subscribe({
      next: (res) => {
        this.actionLoading.set(false);
        this.startTripModalOpen.set(false);
        this.showToast(res.message || 'Viagem iniciada com sucesso!');
        this.locationTracking.startTracking(trip.id);
        this.loadData(true);
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erro ao iniciar a viagem.');
      },
    });
  }

  // --- 2. Concluir Viagem ---
  openCompleteTripModal(): void {
    const trip = this.data()?.trip;
    if (trip?.vehicle?.currentKm) {
      this.completeKm.set(trip.vehicle.currentKm);
    }
    this.completeTripModalOpen.set(true);
  }

  async confirmCompleteTrip(): Promise<void> {
    const trip = this.data()?.trip;
    if (!trip) return;

    this.actionLoading.set(true);

    // Envia os últimos pontos de rastreamento pendentes e encerra o GPS antes de marcar a viagem como concluída no backend
    await this.locationTracking.prepareForCompletion(trip.id);

    this.portalRepository
      .completeTrip({
        tripId: trip.id,
        currentKm: this.completeKm() ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.actionLoading.set(false);
          this.completeTripModalOpen.set(false);
          this.showToast(res.message || 'Viagem finalizada com sucesso!');
          this.locationTracking.stopTracking();
          this.loadData(true);
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.errorMessage.set(err.error?.message || 'Erro ao finalizar a viagem.');
        },
      });
  }

  // --- 3. Abastecimento Rápido com Câmera ---
  openFuelModal(): void {
    const trip = this.data()?.trip;
    if (trip?.vehicle?.currentKm) {
      this.fuelKm.set(trip.vehicle.currentKm);
    }
    this.fuelLiters.set(null);
    this.fuelPricePerLiter.set(null);
    this.fuelGasStation.set('');
    this.fuelFullTank.set(true);
    this.fuelNotes.set('');
    this.fuelReceiptPhoto.set(null);
    this.fuelModalOpen.set(true);
  }

  async onCameraPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      try {
        const compressedBase64 = await compressImage(file, 1280, 1280, 0.75);
        this.fuelReceiptPhoto.set(compressedBase64);
      } catch (err) {
        console.error('Erro ao comprimir foto:', err);
        const reader = new FileReader();
        reader.onload = (e) => {
          this.fuelReceiptPhoto.set(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  submitFuelRecord(): void {
    const trip = this.data()?.trip;
    const vehicleId = trip?.vehicle?.id;

    if (!vehicleId) {
      this.errorMessage.set('Nenhum veículo vinculado à sua viagem.');
      return;
    }

    if (!this.fuelLiters() || !this.fuelPricePerLiter() || !this.fuelKm()) {
      this.errorMessage.set('Preencha os litros, valor por litro e KM do odômetro.');
      return;
    }

    this.actionLoading.set(true);
    this.portalRepository
      .registerFuel({
        vehicleId,
        currentKm: this.fuelKm()!,
        liters: this.fuelLiters()!,
        pricePerLiter: this.fuelPricePerLiter()!,
        fuelType: this.fuelType(),
        gasStation: this.fuelGasStation().trim() || undefined,
        fullTank: this.fuelFullTank(),
        notes: this.fuelNotes().trim() || undefined,
        receiptUrl: this.fuelReceiptPhoto() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.actionLoading.set(false);
          this.fuelModalOpen.set(false);
          this.showToast(`Abastecimento de R$ ${res.totalCost.toFixed(2)} registrado!`);
          this.loadData(true);
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.errorMessage.set(err.error?.message || 'Erro ao registrar abastecimento.');
        },
      });
  }

  // --- 4. Reportar Incidente / SOS ---
  openIncidentModal(): void {
    this.incidentStep.set('FORM');
    this.incidentCategory.set('PNEU');
    this.incidentDescription.set('');
    this.incidentPhoto.set(null);
    this.incidentModalOpen.set(true);
    this.detectCurrentGps();
  }

  detectCurrentGps(): void {
    // 1. Tenta recuperar localização imediatamente do tracking ativo
    const cached = this.locationTracking.lastLocation();
    if (cached) {
      this.incidentGps.set({
        latitude: cached.latitude,
        longitude: cached.longitude,
      });
    }

    // 2. Consulta GPS fresco com alta precisão
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      this.isDetectingGps.set(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.isDetectingGps.set(false);
          this.incidentGps.set({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => {
          this.isDetectingGps.set(false);
          console.warn('[SOS] Falha ao obter GPS preciso:', err.message);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
      );
    }
  }

  async onIncidentPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      try {
        const compressedBase64 = await compressImage(file, 1280, 1280, 0.75);
        this.incidentPhoto.set(compressedBase64);
      } catch (err) {
        console.error('Erro ao comprimir foto da avaria:', err);
        const reader = new FileReader();
        reader.onload = (e) => {
          this.incidentPhoto.set(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removeIncidentPhoto(): void {
    this.incidentPhoto.set(null);
  }

  submitIncident(): void {
    const trip = this.data()?.trip;
    const gps = this.incidentGps();

    this.actionLoading.set(true);
    this.portalRepository
      .reportIncident({
        tripId: trip?.id,
        vehicleId: trip?.vehicle?.id,
        category: this.incidentCategory(),
        description: this.incidentDescription().trim() || undefined,
        latitude: gps?.latitude,
        longitude: gps?.longitude,
        photoUrl: this.incidentPhoto() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.actionLoading.set(false);
          this.lastSubmittedIncident.set({
            protocol: res.protocol || '#00' + Math.floor(1000 + Math.random() * 9000),
            category: res.category,
            description: res.description,
            recordedAt: res.recordedAt || new Date().toISOString(),
            latitude: res.latitude ?? gps?.latitude,
            longitude: res.longitude ?? gps?.longitude,
            locationAddress: res.locationAddress,
            photoUrl: res.photoUrl || this.incidentPhoto() || undefined,
          });
          // Avança para Etapa 2 (Confirmação pós-envio)
          this.incidentStep.set('SUCCESS');
          this.showToast('Alerta SOS registrado com sucesso!');
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.errorMessage.set(err.error?.message || 'Erro ao reportar ocorrência.');
        },
      });
  }

  // --- 5. Documentos do Veículo ---
  openDocsModal(): void {
    this.docsModalOpen.set(true);
  }

  // --- 6. Checklist de Viagem ---
  openChecklistModal(): void {
    this.checklistModalOpen.set(true);
  }

  saveChecklist(): void {
    const trip = this.data()?.trip;
    const checklistData = {
      pneus: this.checklistPneus(),
      oleo: this.checklistOleo(),
      luzes: this.checklistLuzes(),
      freios: this.checklistFreios(),
      verifiedAt: new Date().toISOString(),
    };

    if (trip?.id) {
      this.portalRepository.saveChecklist(trip.id, checklistData).subscribe({
        next: () => {
          this.checklistModalOpen.set(false);
          this.showToast('Checklist veicular verificado e sincronizado!');
        },
        error: () => {
          this.checklistModalOpen.set(false);
          this.showToast('Checklist veicular verificado!');
        },
      });
    } else {
      this.checklistModalOpen.set(false);
      this.showToast('Checklist veicular verificado!');
    }
  }

  private showToast(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => {
      this.successMessage.set(null);
    }, 4000);
  }
}
