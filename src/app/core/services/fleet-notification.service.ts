import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { forkJoin, of, catchError } from 'rxjs';
import { AuthStateService } from './auth-state.service';
import { IDashboardRepository } from '../../domain/repositories/dashboard.repository.interface';
import { ITripRepository } from '../../domain/repositories/trip.repository.interface';
import { IFuelRepository } from '../../domain/repositories/fuel.repository.interface';
import { LiveAlertsService } from './live-alerts.service';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  category: 'SOS' | 'TRIP' | 'FUEL' | 'DOCUMENT' | 'MAINTENANCE';
  link: string;
  read: boolean;
  timestamp: number;
}

const STORAGE_KEY = 'rm_fleet_read_notifications';
const MAX_NOTIFICATIONS = 5;

@Injectable({
  providedIn: 'root'
})
export class FleetNotificationService {
  private readonly authState = inject(AuthStateService);
  private readonly dashboardRepository = inject(IDashboardRepository);
  private readonly tripRepository = inject(ITripRepository);
  private readonly fuelRepository = inject(IFuelRepository);
  private readonly liveAlertsService = inject(LiveAlertsService);

  readonly notifications = signal<NotificationItem[]>([]);
  readonly loading = signal<boolean>(false);

  readonly unreadCount = computed(() => {
    return this.notifications().filter((n) => !n.read).length;
  });

  readonly hasActiveSos = this.liveAlertsService.hasActiveSos;

  private readIds = new Set<string>();
  private pollInterval: any = null;

  constructor() {
    this.loadReadIds();

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

    this.refreshNotifications();
    this.pollInterval = setInterval(() => {
      this.refreshNotifications();
    }, 15000); // Polling a cada 15 segundos
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  refreshNotifications(): void {
    const user = this.authState.currentUser();
    if (!user || user.role === 'DRIVER') return;

    forkJoin({
      summary: this.dashboardRepository.getSummary().pipe(catchError(() => of(null))),
      trips: this.tripRepository.getAll({ limit: 5 }).pipe(catchError(() => of(null))),
      fuels: this.fuelRepository.list({ limit: 5 }).pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ summary, trips, fuels }) => {
        const candidates: NotificationItem[] = [];

        // 1. SOS (Incidentes Abertos em Tempo Real) - Maior Prioridade
        const activeSos = this.liveAlertsService.activeIncidents();
        for (const inc of activeSos) {
          const id = `sos-${inc.id}`;
          candidates.push({
            id,
            title: `🚨 SOS: ${inc.driverName || 'Motorista'} (${inc.category})`,
            message: `"${inc.description}" • Veículo: ${inc.vehiclePlate || 'N/A'}${inc.tripRoute ? ' • ' + inc.tripRoute : ''}`,
            time: 'Agora',
            type: 'CRITICAL',
            category: 'SOS',
            link: '/alertas',
            read: this.readIds.has(id),
            timestamp: Date.now() + 100000000 // Mantém no topo absoluto
          });
        }

        // 2. Viagens Iniciadas / Em Andamento
        const tripList = trips?.data || [];
        for (const t of tripList) {
          const isOngoing = t.status === 'IN_PROGRESS' || (t.status as string) === 'EM_ANDAMENTO';
          if (isOngoing) {
            const id = `trip-${t.id}`;
            const timeStr = t.startedAt ? this.formatRelativeTime(t.startedAt) : 'Em andamento';
            const route = t.originCity || t.origin ? `${t.originCity || t.origin} → ${t.destinationCity || t.destination}` : 'Rota em execução';

            candidates.push({
              id,
              title: `Viagem em Andamento: ${t.driverName || 'Motorista'}`,
              message: `${t.vehiclePlate || 'Veículo'} • ${route}`,
              time: timeStr,
              type: 'INFO',
              category: 'TRIP',
              link: '/viagens',
              read: this.readIds.has(id),
              timestamp: t.startedAt ? new Date(t.startedAt).getTime() : (t.createdAt ? new Date(t.createdAt).getTime() : Date.now())
            });
          }
        }

        // 3. Novos Abastecimentos Registrados
        const fuelList = fuels?.data || [];
        for (const f of fuelList) {
          const id = `fuel-${f.id}`;
          const litersFormatted = `${f.liters ? Number(f.liters).toLocaleString('pt-BR') : '0'}L`;
          const costFormatted = f.totalCost ? Number(f.totalCost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
          const driverText = f.driver?.name ? `por ${f.driver.name}` : (f.gasStation ? `em ${f.gasStation}` : '');
          const timeStr = this.formatRelativeTime(f.fueledAt || f.createdAt);

          candidates.push({
            id,
            title: `Novo Abastecimento: ${f.vehicle?.plate || 'Veículo'}`,
            message: `${litersFormatted} (${f.fuelType || 'Combustível'}) ${costFormatted ? '• ' + costFormatted : ''} ${driverText}`.trim(),
            time: timeStr,
            type: 'INFO',
            category: 'FUEL',
            link: '/abastecimentos',
            read: this.readIds.has(id),
            timestamp: f.fueledAt ? new Date(f.fueledAt).getTime() : (f.createdAt ? new Date(f.createdAt).getTime() : Date.now())
          });
        }

        // 4. Documentos Próximos do Vencimento ou Vencidos (CRLV & CNH)
        if (summary?.expirations) {
          for (const exp of summary.expirations) {
            if (exp.daysRemaining <= 30) {
              const id = `exp-${exp.id}`;
              const isExpired = exp.daysRemaining <= 0;
              const type = isExpired ? 'CRITICAL' : 'WARNING';
              const title = isExpired
                ? `${exp.type} Vencido(a): ${exp.title}`
                : `${exp.type} a Vencer: ${exp.title}`;
              const message = isExpired
                ? `${exp.subtitle} • Venceu em ${exp.expirationDate}`
                : `${exp.subtitle} • Vence em ${exp.daysRemaining} dia(s) (${exp.expirationDate})`;
              const time = isExpired ? 'Vencido' : `Em ${exp.daysRemaining}d`;
              const link = exp.type === 'CRLV' ? '/expiracoes' : '/motoristas';

              // Expirações mais urgentes têm peso temporal maior para aparecer no card
              const urgencyWeight = isExpired ? 50000000 : (30 - exp.daysRemaining) * 86400000;

              candidates.push({
                id,
                title,
                message,
                time,
                type,
                category: 'DOCUMENT',
                link,
                read: this.readIds.has(id),
                timestamp: Date.now() - (exp.daysRemaining > 0 ? (exp.daysRemaining * 3600000) : 0) + urgencyWeight
              });
            }
          }
        }

        // 5. Veículos em Manutenção
        if (summary?.alerts) {
          const maintAlerts = summary.alerts.filter((a) => a.id.startsWith('alert-maint') || a.title.includes('Manutenção'));
          for (const a of maintAlerts) {
            const id = `maint-${a.id}`;
            candidates.push({
              id,
              title: a.title,
              message: a.subtitle,
              time: a.timeAgo || 'Oficina',
              type: 'WARNING',
              category: 'MAINTENANCE',
              link: '/manutencoes',
              read: this.readIds.has(id),
              timestamp: Date.now() - 3600000
            });
          }
        }

        // Ordenação: Eventos mais recentes e críticos no topo
        candidates.sort((a, b) => b.timestamp - a.timestamp);

        // Limita a exatamente MAX_NOTIFICATIONS (5) itens - FIFO: novos itens empurram os antigos
        const finalLimitedList = candidates.slice(0, MAX_NOTIFICATIONS);

        this.notifications.set(finalLimitedList);
      }
    });
  }

  markAsRead(id: string): void {
    this.readIds.add(id);
    this.saveReadIds();
    this.notifications.update((list) =>
      list.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  markAllAsRead(): void {
    const list = this.notifications();
    for (const n of list) {
      this.readIds.add(n.id);
    }
    this.saveReadIds();
    this.notifications.update((items) =>
      items.map((n) => ({ ...n, read: true }))
    );
  }

  private formatRelativeTime(dateInput: Date | string): string {
    if (!dateInput) return 'Recente';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Recente';

    const diffMs = Date.now() - d.getTime();
    if (diffMs < 0) return 'Agora';

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Agora';

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Há ${diffMin} min`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Há ${diffHours} h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Ontem';

    return `Há ${diffDays} dias`;
  }

  private loadReadIds(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.readIds = new Set<string>(parsed);
        }
      }
    } catch {
      // Ignora falhas de parsing de localStorage
    }
  }

  private saveReadIds(): void {
    if (typeof window === 'undefined') return;
    try {
      // Mantém no máximo 100 IDs salvos para não inflar o localStorage
      const arr = Array.from(this.readIds).slice(-100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch {
      // Ignora falhas de escrita de localStorage
    }
  }
}
