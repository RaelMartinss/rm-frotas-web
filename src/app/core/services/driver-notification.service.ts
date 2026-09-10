import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { IDriverPortalRepository } from '../../domain/repositories/driver-portal.repository.interface';

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
const PUSH_TOKEN_KEY = 'rm_fcm_push_token';

@Injectable({
  providedIn: 'root',
})
export class DriverNotificationService {
  private readonly router = inject(Router);
  private readonly driverRepo = inject(IDriverPortalRepository);

  readonly notifications = signal<DriverNotificationItem[]>([]);
  readonly isPanelOpen = signal<boolean>(false);
  readonly pushToken = signal<string | null>(null);

  readonly unreadCount = computed(() => {
    return this.notifications().filter((n) => !n.read).length;
  });

  constructor() {
    this.loadFromStorage();
    this.initNotifications();
  }

  private async initNotifications(): Promise<void> {
    await this.requestPermission();
    if (Capacitor.isNativePlatform()) {
      await this.initPushNotifications();
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const localPerm = await LocalNotifications.checkPermissions();
        if (localPerm.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }

        const pushPerm = await PushNotifications.checkPermissions();
        if (pushPerm.receive !== 'granted') {
          const req = await PushNotifications.requestPermissions();
          return req.receive === 'granted';
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
   * Inicializa ouvintes do Push Notifications do Firebase FCM no Android
   */
  private async initPushNotifications(): Promise<void> {
    try {
      // 1. Registra o aparelho no serviço de Push da Google
      await PushNotifications.register();

      // 2. Ouvinte de Geração do Token FCM com sucesso
      await PushNotifications.addListener('registration', (token: Token) => {
        console.log('[FCM] Token de Notificação gerado:', token.value);
        this.pushToken.set(token.value);
        try {
          localStorage.setItem(PUSH_TOKEN_KEY, token.value);
        } catch {}

        // Envia o token para o backend associado ao motorista logado
        this.syncPushTokenWithBackend(token.value);
      });

      // 3. Ouvinte de erro de registro
      await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('[FCM] Erro ao registrar Push Notifications:', error);
      });

      // 4. Ouvinte de Notificação Recebida com app aberto/minimizado
      await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('[FCM] Notificação recebida em primeiro plano:', notification);
        const type = (notification.data?.type as any) || 'INFO';
        this.addNotificationToHistory({
          title: notification.title || 'RM Frotas',
          body: notification.body || '',
          type,
          link: notification.data?.link || '/motorista',
        });
      });

      // 5. Ouvinte de Clique na notificação na barra de status do Android
      await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('[FCM] Notificação clicada pelo usuário:', action);
        const link = action.notification.data?.link || '/motorista';
        this.router.navigateByUrl(link).catch(() => {});
      });
    } catch (err) {
      console.warn('[FCM] Falha ao inicializar listeners de push:', err);
    }
  }

  /**
   * Envia o token FCM para o backend
   */
  syncPushTokenWithBackend(token?: string): void {
    const activeToken = token || this.pushToken() || localStorage.getItem(PUSH_TOKEN_KEY);
    if (!activeToken) return;

    this.driverRepo.registerPushToken(activeToken).subscribe({
      next: () => {
        console.log('[FCM] Push Token sincronizado com sucesso no backend.');
      },
      error: (err) => {
        console.warn('[FCM] Não foi possível sincronizar token push no momento (usuário pode não estar logado ainda):', err?.status);
      },
    });
  }

  /**
   * Dispara uma notificação nativa no celular (e Web) e salva no histórico
   */
  async notify(item: Omit<DriverNotificationItem, 'id' | 'timestamp' | 'read'>): Promise<void> {
    this.addNotificationToHistory(item);

    // Dispara a Notificação Nativa Local no Sistema Operacional
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

  private addNotificationToHistory(item: Omit<DriverNotificationItem, 'id' | 'timestamp' | 'read'>): void {
    const fullItem: DriverNotificationItem = {
      ...item,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    const updated = [fullItem, ...this.notifications()].slice(0, 30);
    this.notifications.set(updated);
    this.saveToStorage(updated);
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
