import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
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

export const CURRENT_NATIVE_VERSION = '1.0.0';
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

  constructor() {
    // Verifica atualizações automaticamente ao inicializar
    if (typeof window !== 'undefined') {
      setTimeout(() => this.checkForUpdates(), 3000);
    }
  }

  checkForUpdates(): void {
    if (this.isChecking()) return;
    this.isChecking.set(true);

    const releasesUrl = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

    this.http
      .get<GitHubRelease>(releasesUrl)
      .pipe(
        tap((release) => {
          this.isChecking.set(false);
          if (!release || !release.tag_name) return;

          const latestTag = release.tag_name.replace(/^v/i, '').trim();
          this.latestVersion.set(latestTag);
          this.releaseNotes.set(release.body || 'Melhorias de desempenho e novas funcionalidades.');

          // Localiza o asset do APK
          const apkAsset = release.assets?.find((a) => a.name.endsWith('.apk'));
          const url = apkAsset?.browser_download_url || release.html_url || '';
          this.downloadUrl.set(url);

          if (this.isNewerVersion(latestTag, CURRENT_NATIVE_VERSION)) {
            this.hasUpdate.set(true);
          }
        }),
        catchError((err) => {
          this.isChecking.set(false);
          console.log('[AppUpdateService] Verificação de release ignorada ou indisponível:', err?.status);
          return of(null);
        })
      )
      .subscribe();
  }

  downloadAndInstall(): void {
    const url = this.downloadUrl() || `https://github.com/${GITHUB_REPO}/releases/latest`;
    if (typeof window !== 'undefined') {
      window.open(url, '_system');
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
