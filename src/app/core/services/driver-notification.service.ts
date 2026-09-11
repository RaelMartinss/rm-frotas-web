import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { IDriverPortalRepository } from '../../domain/repositories/driver-portal.repository.interface';
import { DriverProfile } from '../../domain/models/driver-portal.model';
import { getDocumentExpirationStatus } from '../utils/document-expiration.util';

export interface DriverNotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'NEW_TRIP' | 'TRIP_STARTED' | 'TRIP_COMPLETED' | 'TRIP_CANCELLED' | 'PENDING_RECEIPT' | 'ALERT' | 'INFO';
  timestamp: string;
  read: boolean;
  link?: string;
}

const STORAGE_KEY = 'rm_driver_notifications';
const LAST_NOTIFIED_TRIP_KEY = 'rm_driver_last_notified_trip';
const LAST_NOTIFIED_STATUS_KEY = 'rm_driver_last_notified_status';
const PUSH_TOKEN_KEY = 'rm_fcm_push_token';
const NOTIFICATION_CHANNEL_ID = 'rm_frotas_channel';

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
    await this.setupNotificationChannels();
    await this.requestPermission();
    if (Capacitor.isNativePlatform()) {
      await this.initPushNotifications();
    }
  }

  /**
   * Cria o canal de notificações de alta prioridade (Heads-up / Banner flutuante no Android)
   */
  async setupNotificationChannels(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await LocalNotifications.createChannel({
        id: NOTIFICATION_CHANNEL_ID,
        name: 'Alertas de Viagens e Frota',
        description: 'Notificações importantes sobre novas viagens, início, conclusão e abastecimentos.',
        importance: 5, // MAX / HIGH - Exibe pop-up/banner na tela
        visibility: 1, // Público
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#2563EB',
      });

      await PushNotifications.createChannel({
        id: NOTIFICATION_CHANNEL_ID,
        name: 'Alertas de Viagens e Frota',
        description: 'Notificações importantes sobre novas viagens, início, conclusão e abastecimentos.',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#2563EB',
      });
    } catch (e) {
      console.warn('[DriverNotification] Erro ao criar canais de notificação:', e);
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
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
      // Registra o aparelho no serviço de Push da Google
      await PushNotifications.register();

      // Ouvinte de Geração do Token FCM com sucesso
      await PushNotifications.addListener('registration', (token: Token) => {
        console.log('[FCM] Token de Notificação gerado:', token.value);
        this.pushToken.set(token.value);
        try {
          localStorage.setItem(PUSH_TOKEN_KEY, token.value);
        } catch {}

        // Envia o token para o backend associado ao motorista logado
        this.syncPushTokenWithBackend(token.value);
      });

      // Ouvinte de erro de registro
      await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('[FCM] Erro ao registrar Push Notifications:', error);
      });

      // Ouvinte de Notificação Recebida com app aberto/minimizado
      await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('[FCM] Notificação recebida em primeiro plano:', notification);
        const type = (notification.data?.type as any) || 'INFO';
        const title = notification.title || notification.data?.title || 'RM Frotas';
        const body = notification.body || notification.data?.body || '';

        this.notify({
          title,
          body,
          type,
          link: notification.data?.link || '/motorista',
        });
      });

      // Ouvinte de Clique na notificação na barra de status do Android
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
              channelId: NOTIFICATION_CHANNEL_ID,
              sound: 'default',
              smallIcon: 'ic_stat_rm_frotas',
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
   * Monitora em tempo real criação, início, conclusão ou cancelamento de viagens
   */
  checkTripUpdates(trip: { id: string; status: string; destinationCity?: string; destinationState?: string; originCity?: string } | null): void {
    try {
      const lastTripId = localStorage.getItem(LAST_NOTIFIED_TRIP_KEY);
      const lastStatus = localStorage.getItem(LAST_NOTIFIED_STATUS_KEY);

      if (!trip) {
        // Se havia uma viagem ativa e agora não há mais, e estava em andamento/programada, pode ter sido cancelada ou concluída
        if (lastTripId && (lastStatus === 'PLANNED' || lastStatus === 'PROGRAMADA' || lastStatus === 'IN_PROGRESS' || lastStatus === 'EM_ANDAMENTO')) {
          localStorage.removeItem(LAST_NOTIFIED_TRIP_KEY);
          localStorage.removeItem(LAST_NOTIFIED_STATUS_KEY);
        }
        return;
      }

      const dest = trip.destinationCity ? `${trip.destinationCity} (${trip.destinationState || ''})` : 'Destino';
      const isNewTrip = lastTripId !== trip.id;
      const isStatusChanged = lastStatus !== trip.status;

      if (isNewTrip) {
        localStorage.setItem(LAST_NOTIFIED_TRIP_KEY, trip.id);
        localStorage.setItem(LAST_NOTIFIED_STATUS_KEY, trip.status);

        this.notify({
          title: '🚚 Nova Corrida Atribuída!',
          body: `Você tem uma nova viagem programada para ${dest}. Abra o app para conferir os detalhes.`,
          type: 'NEW_TRIP',
          link: '/motorista',
        });
        return;
      }

      if (isStatusChanged) {
        localStorage.setItem(LAST_NOTIFIED_STATUS_KEY, trip.status);

        if (trip.status === 'IN_PROGRESS' || trip.status === 'EM_ANDAMENTO') {
          this.notify({
            title: '🚀 Viagem Iniciada!',
            body: `Sua viagem para ${dest} foi iniciada no sistema. Boa rota!`,
            type: 'TRIP_STARTED',
            link: '/motorista',
          });
        } else if (trip.status === 'COMPLETED' || trip.status === 'CONCLUIDA') {
          this.notify({
            title: '✅ Viagem Concluída!',
            body: `A viagem para ${dest} foi concluída com sucesso.`,
            type: 'TRIP_COMPLETED',
            link: '/motorista/historico',
          });
        } else if (trip.status === 'CANCELLED' || trip.status === 'CANCELADA') {
          this.notify({
            title: '⚠️ Viagem Cancelada',
            body: `A viagem para ${dest} foi cancelada pelo gestor.`,
            type: 'TRIP_CANCELLED',
            link: '/motorista',
          });
        }
      }
    } catch (e) {
      console.warn('[DriverNotification] Erro ao verificar atualizações de viagem:', e);
    }
  }

  /**
   * Mantido para compatibilidade com chamadas anteriores
   */
  checkNewTrip(trip: { id: string; status?: string; destinationCity?: string; destinationState?: string; originCity?: string } | null): void {
    if (trip) {
      this.checkTripUpdates({
        id: trip.id,
        status: trip.status || 'PLANNED',
        destinationCity: trip.destinationCity,
        destinationState: trip.destinationState,
        originCity: trip.originCity,
      });
    }
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

  /**
   * Verifica a validade da CNH do motorista e emite notificação nas faixas críticas (<= 7 dias)
   */
  checkCnhExpiration(driver: DriverProfile | null): void {
    if (!driver || !driver.cnhExpirationDate) return;

    const status = getDocumentExpirationStatus(
      driver.cnhExpirationDateIso || driver.cnhExpirationDate,
      new Date(),
      driver.daysUntilCnhExpires,
    );

    if (status.level === 'ORANGE' || status.level === 'RED') {
      const todayStr = new Date().toISOString().slice(0, 10);
      const cnhNotifyKey = `rm_notified_cnh_${status.level}_${todayStr}`;

      try {
        if (!localStorage.getItem(cnhNotifyKey)) {
          localStorage.setItem(cnhNotifyKey, 'true');
          this.notify({
            title: status.level === 'RED' ? '🛑 Bloqueio: CNH Vencendo/Vencida' : '🚨 Atenção: CNH Vence em Breve',
            body: status.level === 'RED'
              ? (status.daysRemaining < 0
                  ? 'Sua CNH está vencida! O início de viagens está bloqueado.'
                  : `Sua CNH vence em ${status.daysRemaining} dia(s)! O início de viagens está bloqueado por segurança.`)
              : `Sua CNH vence em ${status.daysRemaining} dias. Agende a renovação para evitar o bloqueio de início de viagens.`,
            type: 'ALERT',
            link: '/motorista',
          });
        }
      } catch {}
    }
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
