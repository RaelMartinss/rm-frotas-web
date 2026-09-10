import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideDownload,
  LucideShare2,
  LucideCopy,
  LucideMapPin,
  LucideWifiOff,
  LucideFlame,
  LucideInfo,
} from '@lucide/angular';
import { AppUpdateService } from '../../../core/services/app-update.service';

@Component({
  selector: 'app-download-app',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideDownload,
    LucideShare2,
    LucideCopy,
    LucideMapPin,
    LucideWifiOff,
    LucideFlame,
    LucideInfo,
  ],
  templateUrl: './download-app.html',
})
export class DownloadAppComponent {
  readonly updateService = inject(AppUpdateService);
  readonly copied = signal<boolean>(false);

  readonly currentYear = new Date().getFullYear();

  downloadApk(): void {
    const url = this.updateService.downloadUrl() || '/rm-frotas.apk';
    window.location.href = url;
  }

  copyLink(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2500);
      });
    }
  }

  shareWhatsApp(): void {
    const text = encodeURIComponent(
      `🚚 *RM Frotas — Aplicativo do Motorista*\n\nBaixe agora o aplicativo oficial para acompanhamento de viagens e abastecimentos:\n${window.location.href}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }
}
