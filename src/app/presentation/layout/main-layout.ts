import { Component, ElementRef, HostListener, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';
import { AuthStateService } from '../../core/services/auth-state.service';
import { formatUserRole } from '../../domain/models/user.model';
import {
  LucideTruck,
  LucideLayoutDashboard,
  LucideUsers,
  LucideRoute,
  LucideFuel,
  LucideWrench,
  LucideClock,
  LucideBell,
  LucideFileText,
  LucideUserCheck,
  LucideSettings,
  LucideMenu,
  LucideSearch,
  LucideLogOut,
  LucideUser,
  LucideX,
  LucidePlusCircle,
  LucideAlertTriangle,
  LucideCheck,
  LucideCornerDownLeft,
  LucideArrowRight,
  LucideShieldAlert,
  LucideSparkles
} from '@lucide/angular';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Navegação' | 'Ações Rápidas' | 'Sistema';
  icon: string;
  route?: string;
  action?: () => void;
  shortcut?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  link: string;
  read: boolean;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideTruck,
    LucideLayoutDashboard,
    LucideUsers,
    LucideRoute,
    LucideFuel,
    LucideWrench,
    LucideClock,
    LucideBell,
    LucideFileText,
    LucideUserCheck,
    LucideSettings,
    LucideMenu,
    LucideSearch,
    LucideLogOut,
    LucideUser,
    LucideX,
    LucidePlusCircle,
    LucideAlertTriangle,
    LucideCheck,
    LucideCornerDownLeft,
    LucideArrowRight,
    LucideShieldAlert,
    LucideSparkles
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css'
})
export class MainLayoutComponent {
  private readonly authRepository = inject(IAuthRepository);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  @ViewChild('paletteInput') paletteInputRef?: ElementRef<HTMLInputElement>;

  currentUser = this.authState.currentUser;
  readonly formatUserRole = formatUserRole;
  sidebarOpen = signal(true);
  commandPaletteOpen = signal(false);
  notificationsOpen = signal(false);
  searchQuery = signal('');
  selectedIndex = signal(0);

  // Lista de Notificações
  notifications = signal<NotificationItem[]>([
    {
      id: '1',
      title: 'CRLV Próximo do Vencimento',
      message: 'Veículo Volvo FH 540 (ABC-1D23) vence em 8 dias.',
      time: 'Há 15 min',
      type: 'CRITICAL',
      link: '/expiracoes',
      read: false
    },
    {
      id: '2',
      title: 'CNH a Vencer',
      message: 'Motorista Carlos Eduardo Silva com CNH vencendo em 18 dias.',
      time: 'Há 2 horas',
      type: 'WARNING',
      link: '/motoristas',
      read: false
    },
    {
      id: '3',
      title: 'Manutenção Preventiva',
      message: 'Scania R450 atingiu 120.000 km. Revisão recomendada.',
      time: 'Há 4 horas',
      type: 'INFO',
      link: '/manutencoes',
      read: false
    }
  ]);

  unreadNotificationsCount = computed(() => {
    return this.notifications().filter((n) => !n.read).length;
  });

  // Itens da Command Palette
  readonly commandItems: CommandItem[] = [
    {
      id: 'nav-dashboard',
      title: 'Dashboard Executivo',
      subtitle: 'Visão geral da frota, KPIs e gráficos operacionais',
      category: 'Navegação',
      icon: 'dashboard',
      route: '/dashboard'
    },
    {
      id: 'nav-veiculos',
      title: 'Veículos da Frota',
      subtitle: 'Listagem, status e gestão documental de veículos',
      category: 'Navegação',
      icon: 'truck',
      route: '/veiculos'
    },
    {
      id: 'nav-motoristas',
      title: 'Quadro de Motoristas',
      subtitle: 'Condutores, categorias de CNH e vínculos',
      category: 'Navegação',
      icon: 'users',
      route: '/motoristas'
    },
    {
      id: 'nav-viagens',
      title: 'Controle de Viagens',
      subtitle: 'Monitoramento de rotas, origem e destino em tempo real',
      category: 'Navegação',
      icon: 'route',
      route: '/viagens'
    },
    {
      id: 'nav-abastecimentos',
      title: 'Abastecimentos & Consumo',
      subtitle: 'Registro de abastecimentos, postos e médias de consumo',
      category: 'Navegação',
      icon: 'fuel',
      route: '/abastecimentos'
    },
    {
      id: 'nav-manutencoes',
      title: 'Ordens de Manutenção',
      subtitle: 'Preventivas, corretivas e histórico mecânico',
      category: 'Navegação',
      icon: 'wrench',
      route: '/manutencoes'
    },
    {
      id: 'nav-expiracoes',
      title: 'Painel de Expirações',
      subtitle: 'Controle de prazos de CRLV, CNHs e vistorias',
      category: 'Navegação',
      icon: 'clock',
      route: '/expiracoes'
    },
    {
      id: 'nav-alertas',
      title: 'Central de Alertas',
      subtitle: 'Avisos críticos e ocorrências operacionais',
      category: 'Navegação',
      icon: 'bell',
      route: '/alertas'
    },
    {
      id: 'nav-relatorios',
      title: 'Relatórios & Auditoria',
      subtitle: 'Exportações gerenciais e métricas de desempenho',
      category: 'Navegação',
      icon: 'file-text',
      route: '/relatorios'
    },
    {
      id: 'nav-usuarios',
      title: 'Gestão de Usuários',
      subtitle: 'Controle de acesso, perfis e permissões',
      category: 'Navegação',
      icon: 'user-check',
      route: '/usuarios'
    },
    {
      id: 'nav-config',
      title: 'Configurações da Conta',
      subtitle: 'Preferências da organização e parâmetros de frota',
      category: 'Sistema',
      icon: 'settings',
      route: '/configuracoes'
    },
    {
      id: 'nav-perfil',
      title: 'Meu Perfil',
      subtitle: 'Dados cadastrais e alteração de senha',
      category: 'Sistema',
      icon: 'user',
      route: '/perfil'
    },
    {
      id: 'act-new-vehicle',
      title: 'Cadastrar Novo Veículo',
      subtitle: 'Adicionar novo caminhão ou utilitário à frota',
      category: 'Ações Rápidas',
      icon: 'plus',
      route: '/veiculos'
    },
    {
      id: 'act-new-driver',
      title: 'Cadastrar Novo Motorista',
      subtitle: 'Vincular novo condutor com CNH à operação',
      category: 'Ações Rápidas',
      icon: 'plus',
      route: '/motoristas'
    },
    {
      id: 'act-new-trip',
      title: 'Lançar Nova Viagem',
      subtitle: 'Alocar veículo e motorista para uma rota',
      category: 'Ações Rápidas',
      icon: 'plus',
      route: '/viagens'
    },
    {
      id: 'act-logout',
      title: 'Encerrar Sessão',
      subtitle: 'Sair da conta com segurança',
      category: 'Sistema',
      icon: 'logout',
      action: () => this.logout()
    }
  ];

  filteredCommands = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) {
      return this.commandItems;
    }
    return this.commandItems.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSub = item.subtitle?.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      return matchTitle || matchSub || matchCat;
    });
  });

  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent): void {
    // Ctrl + K ou Cmd + K -> Abrir/Fechar Command Palette
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggleCommandPalette();
      return;
    }

    // Escape -> Fechar Paleta ou Notificações
    if (event.key === 'Escape') {
      if (this.commandPaletteOpen()) {
        this.closeCommandPalette();
        return;
      }
      if (this.notificationsOpen()) {
        this.closeNotifications();
        return;
      }
    }

    // Navegação por teclado dentro da Command Palette
    if (this.commandPaletteOpen()) {
      const items = this.filteredCommands();
      if (!items.length) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.selectedIndex.update((i) => (i + 1) % items.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.selectedIndex.update((i) => (i - 1 + items.length) % items.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const selected = items[this.selectedIndex()];
        if (selected) {
          this.executeCommand(selected);
        }
      }
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  toggleCommandPalette(): void {
    const isOpen = this.commandPaletteOpen();
    if (!isOpen) {
      this.searchQuery.set('');
      this.selectedIndex.set(0);
      this.notificationsOpen.set(false);
      this.commandPaletteOpen.set(true);
      setTimeout(() => {
        this.paletteInputRef?.nativeElement?.focus();
      }, 50);
    } else {
      this.closeCommandPalette();
    }
  }

  closeCommandPalette(): void {
    this.commandPaletteOpen.set(false);
    this.searchQuery.set('');
  }

  toggleNotifications(): void {
    this.notificationsOpen.update((v) => !v);
  }

  closeNotifications(): void {
    this.notificationsOpen.set(false);
  }

  markAllNotificationsAsRead(): void {
    this.notifications.update((list) =>
      list.map((n) => ({ ...n, read: true }))
    );
  }

  markNotificationAsRead(id: string): void {
    this.notifications.update((list) =>
      list.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.selectedIndex.set(0);
  }

  executeCommand(item: CommandItem): void {
    this.closeCommandPalette();
    if (item.action) {
      item.action();
    } else if (item.route) {
      this.router.navigateByUrl(item.route);
    }
  }

  logout(): void {
    this.authRepository.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}


