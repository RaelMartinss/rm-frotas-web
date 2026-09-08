import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IDriverPortalRepository } from '../../../domain/repositories/driver-portal.repository.interface';
import {
  DriverHistoryItem,
  DriverFuelHistoryItem,
} from '../../../domain/models/driver-portal.model';
import { compressImage } from '../../../core/utils/image-compressor';
import {
  LucideClock,
  LucideTruck,
  LucideCheckCircle2,
  LucideXCircle,
  LucideArrowLeft,
  LucideRefreshCw,
  LucideFuel,
  LucideCamera,
  LucideAlertCircle,
  LucideCheck,
  LucideX,
  LucideExternalLink,
  LucideEye,
  LucideGauge,
} from '@lucide/angular';

@Component({
  selector: 'app-driver-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    LucideClock,
    LucideTruck,
    LucideCheckCircle2,
    LucideXCircle,
    LucideArrowLeft,
    LucideRefreshCw,
    LucideFuel,
    LucideCamera,
    LucideAlertCircle,
    LucideCheck,
    LucideX,
    LucideExternalLink,
    LucideEye,
    LucideGauge,
  ],
  templateUrl: './driver-history.html',
})
export class DriverHistoryComponent implements OnInit {
  private readonly portalRepository = inject(IDriverPortalRepository);
  private readonly route = inject(ActivatedRoute);

  // Aba ativa: 'trips' ou 'fuel'
  readonly activeTab = signal<'trips' | 'fuel'>('trips');

  // Listas
  readonly history = signal<DriverHistoryItem[]>([]);
  readonly fuelHistory = signal<DriverFuelHistoryItem[]>([]);

  // Filtro de pendência na aba de abastecimentos
  readonly filterPendingOnly = signal<boolean>(false);

  // Estados de carregamento
  readonly loading = signal<boolean>(true);
  readonly refreshing = signal<boolean>(false);
  readonly actionLoading = signal<boolean>(false);
  readonly toastMessage = signal<string | null>(null);

  // Modais de comprovante
  readonly selectedFuelRecord = signal<DriverFuelHistoryItem | null>(null);
  readonly attachModalOpen = signal<boolean>(false);
  readonly viewReceiptModalOpen = signal<boolean>(false);
  readonly receiptPhoto = signal<string | null>(null);
  readonly receiptNotes = signal<string>('');

  // Contagem de pendências
  readonly pendingCount = computed(() => {
    return this.fuelHistory().filter((f) => f.isPendingReceipt).length;
  });

  // Lista de abastecimentos filtrada
  readonly displayedFuelHistory = computed(() => {
    const list = this.fuelHistory();
    if (this.filterPendingOnly()) {
      return list.filter((f) => f.isPendingReceipt);
    }
    return list;
  });

  ngOnInit(): void {
    // Lê query param ?tab=fuel se existir
    const tabParam = this.route.snapshot.queryParams['tab'];
    if (tabParam === 'fuel') {
      this.activeTab.set('fuel');
    }

    this.loadAllData();
  }

  setTab(tab: 'trips' | 'fuel'): void {
    this.activeTab.set(tab);
  }

  loadAllData(isRefresh = false): void {
    if (isRefresh) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }

    this.portalRepository.getHistory().subscribe({
      next: (items) => {
        this.history.set(items);
        this.loadFuelHistory(isRefresh);
      },
      error: () => {
        this.loadFuelHistory(isRefresh);
      },
    });
  }

  loadFuelHistory(isRefresh = false): void {
    this.portalRepository.getFuelHistory().subscribe({
      next: (items) => {
        this.fuelHistory.set(items);
        this.loading.set(false);
        this.refreshing.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
      },
    });
  }

  // --- MODAL: ANEXAR COMPROVANTE ---
  openAttachModal(item: DriverFuelHistoryItem): void {
    this.selectedFuelRecord.set(item);
    this.receiptPhoto.set(item.receiptUrl || null);
    this.receiptNotes.set(item.notes || '');
    this.attachModalOpen.set(true);
  }

  closeAttachModal(): void {
    this.attachModalOpen.set(false);
    this.selectedFuelRecord.set(null);
    this.receiptPhoto.set(null);
    this.receiptNotes.set('');
  }

  async onCameraPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      try {
        const compressedBase64 = await compressImage(file, 1280, 1280, 0.75);
        this.receiptPhoto.set(compressedBase64);
      } catch (err) {
        console.error('Erro ao comprimir foto:', err);
        const reader = new FileReader();
        reader.onload = (e) => {
          this.receiptPhoto.set(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  submitReceipt(): void {
    const record = this.selectedFuelRecord();
    const photo = this.receiptPhoto();

    if (!record || !photo) {
      this.showToast('Tire ou selecione uma foto do comprovante antes de salvar.');
      return;
    }

    this.actionLoading.set(true);
    this.portalRepository
      .updateFuelReceipt(record.id, photo, this.receiptNotes().trim() || undefined)
      .subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.closeAttachModal();
          this.showToast('Comprovante anexado com sucesso!');
          this.loadFuelHistory(true);
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.showToast(err.error?.message || 'Erro ao salvar comprovante.');
        },
      });
  }

  // --- MODAL: VISUALIZAR COMPROVANTE ---
  openViewReceiptModal(item: DriverFuelHistoryItem): void {
    this.selectedFuelRecord.set(item);
    this.viewReceiptModalOpen.set(true);
  }

  closeViewReceiptModal(): void {
    this.viewReceiptModalOpen.set(false);
    this.selectedFuelRecord.set(null);
  }

  openFullReceipt(url: string): void {
    if (!url) return;
    const win = window.open();
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>Comprovante de Abastecimento</title>
            <style>
              body { margin: 0; background: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
              img { max-width: 95vw; max-height: 95vh; object-fit: contain; border-radius: 8px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
            </style>
          </head>
          <body>
            <img src="${url}" alt="Comprovante de Abastecimento" />
          </body>
        </html>
      `);
      win.document.close();
    }
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }

  getFuelTypeBadgeClass(type: string): string {
    switch (type) {
      case 'GASOLINA':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/40';
      case 'ETANOL':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40';
      case 'DIESEL':
      case 'DIESEL_S10':
        return 'bg-blue-950/80 text-blue-300 border-blue-800/40';
      case 'GNV':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  }
}
