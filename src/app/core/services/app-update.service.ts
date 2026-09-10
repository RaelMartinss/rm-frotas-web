import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { catchError, of, tap } from 'rxjs';

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

interface AppInstallerPlugin {
  canInstall(): Promise<{ value: boolean }>;
  openInstallSettings(): Promise<void>;
  downloadAndInstall(options: { url: string }): Promise<void>;
  addListener(eventName: 'downloadProgress', listenerFunc: (data: { progress: number }) => void): Promise<any>;
  addListener(eventName: 'downloadCompleted', listenerFunc: (data: { progress: number; path: string }) => void): Promise<any>;
  addListener(eventName: 'downloadError', listenerFunc: (data: { error: string }) => void): Promise<any>;
}

const AppInstaller = registerPlugin<AppInstallerPlugin>('AppInstaller');

export const CURRENT_NATIVE_VERSION = '1.0.12';
const GITHUB_REPO = 'RaelMartinss/rm-frotas-web';

@Injectable({
  providedIn: 'root',
})
export class AppUpdateService {
  private readonly http = inject(HttpClient);

  readonly currentVersion = signal<string>(CURRENT_NATIVE_VERSION);
  readonly latestVersion = signal<string>(CURRENT_NATIVE_VERSION);
  readonly hasUpdate = signal<boolean>(false);
  readonly isDismissed = signal<boolean>(false);
  readonly downloadUrl = signal<string>('');
  readonly releaseNotes = signal<string>('');
  readonly isChecking = signal<boolean>(false);
  readonly isDownloading = signal<boolean>(false);
  readonly downloadProgress = signal<number>(0);
  readonly checkStatusMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    // Verifica atualizações automaticamente ao inicializar
    if (typeof window !== 'undefined') {
      setTimeout(() => this.checkForUpdates(), 2500);
    }
  }

  async checkForUpdates(): Promise<void> {
    if (this.isChecking()) return;
    this.isChecking.set(true);
    this.checkStatusMessage.set('Consultando atualizações...');

    try {
      const releasesUrl = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest?_t=${Date.now()}`;
      const response = await fetch(releasesUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      this.isChecking.set(false);

      if (!response.ok) {
        console.warn('[AppUpdateService] Resposta do GitHub:', response.status);
        this.checkStatusMessage.set('Não foi possível verificar atualizações no momento.');
        setTimeout(() => this.checkStatusMessage.set(null), 4000);
        return;
      }

      const release: GitHubRelease = await response.json();
      if (!release || !release.tag_name) {
        this.checkStatusMessage.set('Nenhuma release encontrada.');
        setTimeout(() => this.checkStatusMessage.set(null), 3000);
        return;
      }

      const latestTag = release.tag_name.replace(/^v/i, '').trim();
      this.latestVersion.set(latestTag);
      this.releaseNotes.set(release.body || 'Melhorias de desempenho e novas funcionalidades.');

      // Localiza o asset do APK
      const apkAsset = release.assets?.find((a) => a.name.endsWith('.apk'));
      const url = apkAsset?.browser_download_url || '';
      this.downloadUrl.set(url);

      if (this.isNewerVersion(latestTag, this.currentVersion())) {
        this.hasUpdate.set(true);
        this.isDismissed.set(false);
        this.checkStatusMessage.set(`Nova versão v${latestTag} encontrada!`);
      } else {
        this.checkStatusMessage.set('Você já está na versão mais recente!');
      }

      setTimeout(() => this.checkStatusMessage.set(null), 4000);
    } catch (err: any) {
      this.isChecking.set(false);
      console.warn('[AppUpdateService] Erro ao consultar GitHub releases:', err);
      this.checkStatusMessage.set('Falha na conexão ao checar versão.');
      setTimeout(() => this.checkStatusMessage.set(null), 4000);
    }
  }

  async downloadAndInstall(): Promise<void> {
    const url = this.downloadUrl();

    if (Capacitor.isNativePlatform()) {
      if (!url || !url.endsWith('.apk')) {
        this.errorMessage.set('Pacote APK da versão mais recente não disponível no momento.');
        return;
      }

      try {
        this.isDownloading.set(true);
        this.downloadProgress.set(0);
        this.errorMessage.set(null);

        // Limpa ouvintes anteriores para evitar duplicidade
        try {
          await (AppInstaller as any).removeAllListeners();
        } catch {}

        // Ouvintes de progresso
        await AppInstaller.addListener('downloadProgress', (data: { progress: number }) => {
          this.downloadProgress.set(data.progress);
        });

        await AppInstaller.addListener('downloadCompleted', () => {
          this.downloadProgress.set(100);
          this.isDownloading.set(false);
        });

        await AppInstaller.addListener('downloadError', (err: { error: string }) => {
          this.isDownloading.set(false);
          this.errorMessage.set(err.error || 'Erro ao baixar atualização no dispositivo.');
        });

        await AppInstaller.downloadAndInstall({ url });
      } catch (err: any) {
        console.error('Erro no AppInstaller:', err);
        this.isDownloading.set(false);
        this.errorMessage.set(err?.message || 'Falha ao iniciar instalador nativo.');
      }
    } else if (typeof window !== 'undefined') {
      window.open(url || `https://github.com/${GITHUB_REPO}/releases/latest`, '_blank');
    }
  }

  dismiss(): void {
    this.isDismissed.set(true);
  }

  /**
   * Compara duas versões em formato SemVer (ex: 1.1.0 > 1.0.0)
   */
  private isNewerVersion(remote: string, current: string): boolean {
    try {
      const rParts = remote.split('.').map((p) => parseInt(p, 10) || 0);
      const cParts = current.split('.').map((p) => parseInt(p, 10) || 0);

      for (let i = 0; i < Math.max(rParts.length, cParts.length); i++) {
        const r = rParts[i] || 0;
        const c = cParts[i] || 0;
        if (r > c) return true;
        if (r < c) return false;
      }
    } catch {
      return false;
    }
    return false;
  }
}
