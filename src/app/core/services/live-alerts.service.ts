import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { IIncidentRepository } from '../../domain/repositories/incident.repository.interface';
import { Incident } from '../../domain/models/incident.model';
import { ToastService } from './toast.service';
import { AuthStateService } from './auth-state.service';

@Injectable({
  providedIn: 'root'
})
export class LiveAlertsService {
  private readonly incidentRepository = inject(IIncidentRepository);
  private readonly toastService = inject(ToastService);
  private readonly authState = inject(AuthStateService);

  readonly activeIncidents = signal<Incident[]>([]);
  readonly activeSosCount = computed(() => this.activeIncidents().length);
  readonly hasActiveSos = computed(() => this.activeIncidents().length > 0);

  private knownIncidentIds = new Set<string>();
  private isFirstLoad = true;
  private pollInterval: any = null;

  constructor() {
    // Monitora o estado de autenticação para iniciar/parar o polling
    effect(() => {
      const user = this.authState.currentUser();
      if (user && user.role !== 'DRIVER') {
        this.startPolling();
      } else {
        this.stopPolling();
      }
    });
  }

  startPolling(): void {
    if (this.pollInterval) return;

    this.checkIncidents();
    this.pollInterval = setInterval(() => {
      this.checkIncidents();
    }, 7000); // Polling a cada 7 segundos
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  checkIncidents(): void {
    const user = this.authState.currentUser();
    if (!user || user.role === 'DRIVER') return;

    this.incidentRepository.getAll({ status: 'OPEN' }).subscribe({
      next: (incidents) => {
        const list = incidents || [];
        this.activeIncidents.set(list);

        if (this.isFirstLoad) {
          list.forEach((inc) => this.knownIncidentIds.add(inc.id));
          this.isFirstLoad = false;
          return;
        }

        // Verifica novos incidentes que ainda não foram notificados
        for (const inc of list) {
          if (!this.knownIncidentIds.has(inc.id)) {
            this.knownIncidentIds.add(inc.id);
            this.notifyNewSos(inc);
          }
        }
      },
      error: () => {
        // Falhas transitórias de rede são tratadas silenciosamente
      }
    });
  }

  private notifyNewSos(inc: Incident): void {
    const driverName = inc.driverName || 'Motorista';
    const plate = inc.vehiclePlate ? ` • Placa: ${inc.vehiclePlate}` : '';
    const route = inc.tripRoute ? ` • ${inc.tripRoute}` : '';

    // Dispara Toast de Alerta Crítico
    this.toastService.error(
      `🚨 ALERTA SOS: ${driverName} [${inc.category}] - "${inc.description}"${plate}${route}`
    );

    // Toca som de sirene / emergência sutil via Web Audio API
    this.playEmergencyBeep();
  }

  private playEmergencyBeep(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      const now = ctx.currentTime;

      // Frequências de sirene de atenção (duplo bip agudo)
      osc.frequency.setValueAtTime(880, now); // Lá 5
      osc.frequency.setValueAtTime(659.25, now + 0.15); // Mi 5
      osc.frequency.setValueAtTime(880, now + 0.3);
      osc.frequency.setValueAtTime(659.25, now + 0.45);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch {
      // Ignora restrições de permissão de áudio do navegador caso ocorram
    }
  }

  resolveIncident(id: string): void {
    this.incidentRepository.resolve(id).subscribe({
      next: () => {
        this.activeIncidents.update((list) => list.filter((i) => i.id !== id));
        this.toastService.success('Alerta SOS marcado como atendido com sucesso.');
      },
      error: () => {
        this.toastService.error('Erro ao marcar SOS como atendido.');
      }
    });
  }
}
