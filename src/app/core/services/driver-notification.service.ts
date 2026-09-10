import { Injectable, signal, computed } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface DriverNotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'NEW_TRIP' | 'PENDING_RECEIPT' | 'ALERT' | 'INFO';
  timestamp: string;
  read: boolean;
  link?: string;
}

const STORAGE_KEY = 'rm_driver_notifications';
const LAST_NOTIFIED_TRIP_KEY = 'rm_driver_last_notified_trip';

@Injectable({
  providedIn: 'root',
})
export class DriverNotificationService {
  readonly notifications = signal<DriverNotificationItem[]>([]);
  readonly isPanelOpen = signal<boolean>(false);

  readonly unreadCount = computed(() => {
    return this.notifications().filter((n) => !n.read).length;
  });

  constructor() {
    this.loadFromStorage();
    this.requestPermission();
  }

  async requestPermission(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          return req.display === 'granted';
        }
        return true;
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          const res = await Notification.requestPermission();
          return res === 'granted';
        }
        return Notification.permission === 'granted';
      }
    } catch (e) {
      console.warn('[DriverNotification] Erro ao solicitar permissão de notificação:', e);
    }
    return false;
  }

  /**
   * Dispara uma notificação nativa no celular (e Web) e salva no histórico
   */
  async notify(item: Omit<DriverNotificationItem, 'id' | 'timestamp' | 'read'>): Promise<void> {
    const fullItem: DriverNotificationItem = {
      ...item,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    // 1. Adiciona à lista da Central de Notificações
    const updated = [fullItem, ...this.notifications()].slice(0, 30); // Limita a 30 notificações
    this.notifications.set(updated);
    this.saveToStorage(updated);

    // 2. Dispara a Notificação Nativa no Sistema Operacional (Android / Navegador)
    try {
      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 100000),
              title: item.title,
              body: item.body,
              schedule: { at: new Date(Date.now() + 100) },
              sound: 'default',
              smallIcon: 'ic_launcher_foreground',
              actionTypeId: '',
              extra: null,
            },
          ],
        });
      } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(item.title, {
          body: item.body,
          icon: '/favicon-192x192.png',
        });
      }
    } catch (err) {
      console.warn('[DriverNotification] Falha ao disparar notificação no SO:', err);
    }
  }

  /**
   * Verifica se há uma nova viagem atribuída ao motorista
   */
  checkNewTrip(trip: { id: string; destinationCity?: string; destinationState?: string; originCity?: string } | null): void {
    if (!trip || !trip.id) return;

    try {
      const lastTripId = localStorage.getItem(LAST_NOTIFIED_TRIP_KEY);
      if (lastTripId !== trip.id) {
        localStorage.setItem(LAST_NOTIFIED_TRIP_KEY, trip.id);

        const dest = trip.destinationCity ? `${trip.destinationCity} (${trip.destinationState || ''})` : 'Novo Destino';
        this.notify({
          title: '🚚 Nova Corrida Atribuída!',
          body: `Você tem uma nova viagem programada para ${dest}. Abra o aplicativo para conferir os detalhes.`,
          type: 'NEW_TRIP',
          link: '/motorista',
        });
      }
    } catch {}
  }

  /**
   * Verifica se há pendências de comprovantes de abastecimento
   */
  checkPendingReceipts(count: number): void {
    if (count <= 0) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const lastPendingNotifyKey = `rm_notified_pending_${todayStr}`;

    try {
      if (!sessionStorage.getItem(lastPendingNotifyKey)) {
        sessionStorage.setItem(lastPendingNotifyKey, 'true');
        this.notify({
          title: '⛽ Comprovante Pendente',
          body: `Você possui ${count} abastecimento(s) aguardando o envio da foto do comprovante fiscal.`,
          type: 'PENDING_RECEIPT',
          link: '/motorista/historico',
        });
      }
    } catch {}
  }

  togglePanel(): void {
    this.isPanelOpen.set(!this.isPanelOpen());
  }

  closePanel(): void {
    this.isPanelOpen.set(false);
  }

  markAsRead(id: string): void {
    const updated = this.notifications().map((n) => (n.id === id ? { ...n, read: true } : n));
    this.notifications.set(updated);
    this.saveToStorage(updated);
  }

  markAllAsRead(): void {
    const updated = this.notifications().map((n) => ({ ...n, read: true }));
    this.notifications.set(updated);
    this.saveToStorage(updated);
  }

  clearAll(): void {
    this.notifications.set([]);
    this.saveToStorage([]);
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.notifications.set(JSON.parse(data));
      }
    } catch {}
  }

  private saveToStorage(items: DriverNotificationItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }
}
