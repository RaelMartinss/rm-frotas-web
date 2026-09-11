export type DocumentUrgencyLevel = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export interface DocumentExpirationStatus {
  daysRemaining: number;
  level: DocumentUrgencyLevel;
  isExpired: boolean;
  canStartTrip: boolean;
  label: string;
  badgeText: string;
  badgeClass: string;
  bannerVisible: boolean;
  bannerTitle: string;
  bannerDesc: string;
  bannerClass: string;
  bannerIconClass: string;
  blockReason: string | null;
}

/**
 * Converte string de data (pt-BR "DD/MM/YYYY" ou ISO "YYYY-MM-DD") ou Date para Date civil local
 */
export function parseDateCivil(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
  }

  const trimmed = dateInput.trim();
  // Formato pt-BR: DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
    const parts = trimmed.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2].slice(0, 4), 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Formato ISO ou outro
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Calcula o status de validade de um documento (ex: CNH) segundo a hierarquia de 4 cores:
 * 🟢 +30 dias: Verde (Regular / Seguro)
 * 🟡 30 a 8 dias: Amarelo (Atenção / Agendar renovação)
 * 🟠 7 a 2 dias: Laranja (Alerta Crítico / Risco iminente)
 * 🔴 <= 1 dia ou vencida: Vermelho (Perigo / Bloqueio total de início de viagem)
 */
export function getDocumentExpirationStatus(
  dateInput: string | Date | null | undefined,
  referenceDate: Date = new Date(),
  backendDaysUntilExpires?: number | null,
): DocumentExpirationStatus {
  const refCivil = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );

  let daysRemaining: number;
  if (typeof backendDaysUntilExpires === 'number' && !isNaN(backendDaysUntilExpires)) {
    daysRemaining = backendDaysUntilExpires;
  } else {
    const expCivil = parseDateCivil(dateInput);
    if (!expCivil) {
      // Sem data definida, consideramos seguro
      return {
        daysRemaining: 999,
        level: 'GREEN',
        isExpired: false,
        canStartTrip: true,
        label: 'Em dia',
        badgeText: 'Em dia',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        bannerVisible: false,
        bannerTitle: '',
        bannerDesc: '',
        bannerClass: '',
        bannerIconClass: '',
        blockReason: null,
      };
    }
    const diffMs = expCivil.getTime() - refCivil.getTime();
    daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  const isExpired = daysRemaining < 0;

  // 🔴 <= 1 dia ou vencida: Bloqueio estrito de início de viagens
  if (daysRemaining <= 1) {
    let badgeText = 'Vence em 1 dia';
    let bannerTitle = '🛑 CNH vence amanhã — Início de viagem bloqueado';
    if (daysRemaining < 0) {
      badgeText = 'CNH Vencida';
      bannerTitle = '🛑 CNH Vencida — Início de viagem bloqueado';
    } else if (daysRemaining === 0) {
      badgeText = 'Vence Hoje';
      bannerTitle = '🛑 CNH vence hoje — Início de viagem bloqueado';
    }

    return {
      daysRemaining,
      level: 'RED',
      isExpired,
      canStartTrip: false,
      label: isExpired ? 'Vencida' : 'Vence em <= 1 dia',
      badgeText,
      badgeClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold',
      bannerVisible: true,
      bannerTitle,
      bannerDesc:
        'Por segurança jurídica e operacional da frota, é proibido iniciar viagens com a CNH vencida ou a 1 dia do vencimento.',
      bannerClass: 'bg-rose-950/40 border-rose-500/40 text-rose-200',
      bannerIconClass: 'text-rose-400',
      blockReason:
        daysRemaining < 0
          ? 'Sua CNH está vencida. Regularize o documento para iniciar novas viagens.'
          : 'Sua CNH vence em até 1 dia. Por segurança operacional, o início de viagens está bloqueado.',
    };
  }

  // 🟠 7 a 2 dias: Laranja (Alerta Crítico / Risco iminente)
  if (daysRemaining <= 7) {
    return {
      daysRemaining,
      level: 'ORANGE',
      isExpired: false,
      canStartTrip: true,
      label: 'Alerta Crítico',
      badgeText: `Vence em ${daysRemaining} dias`,
      badgeClass: 'bg-orange-500/20 text-orange-300 border border-orange-500/40 font-semibold',
      bannerVisible: true,
      bannerTitle: `🚨 CNH vence em ${daysRemaining} dias!`,
      bannerDesc:
        'Atenção máxima: novas viagens serão bloqueadas quando faltar 1 dia para o vencimento. Agende a renovação imediatamente.',
      bannerClass: 'bg-orange-950/40 border-orange-500/40 text-orange-200',
      bannerIconClass: 'text-orange-400',
      blockReason: null,
    };
  }

  // 🟡 30 a 8 dias: Amarelo (Atenção / Agendar renovação)
  if (daysRemaining <= 30) {
    return {
      daysRemaining,
      level: 'YELLOW',
      isExpired: false,
      canStartTrip: true,
      label: 'Atenção',
      badgeText: `Vence em ${daysRemaining} dias`,
      badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium',
      bannerVisible: true,
      bannerTitle: `⚠️ CNH vence em ${daysRemaining} dias`,
      bannerDesc:
        'Sua carteira de habilitação está próxima do vencimento. Programe a renovação para não ter viagens interrompidas.',
      bannerClass: 'bg-amber-950/40 border-amber-500/30 text-amber-200',
      bannerIconClass: 'text-amber-400',
      blockReason: null,
    };
  }

  // 🟢 +30 dias: Verde (Regular / Seguro)
  return {
    daysRemaining,
    level: 'GREEN',
    isExpired: false,
    canStartTrip: true,
    label: 'Em dia',
    badgeText: 'Em dia',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    bannerVisible: false,
    bannerTitle: '',
    bannerDesc: '',
    bannerClass: '',
    bannerIconClass: '',
    blockReason: null,
  };
}
