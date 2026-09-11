import {
  getDocumentExpirationStatus,
  parseDateCivil,
} from './document-expiration.util';

describe('DocumentExpirationUtil', () => {
  const baseDate = new Date(2026, 8, 10); // 10 de Setembro de 2026

  describe('parseDateCivil', () => {
    it('deve converter formato pt-BR DD/MM/YYYY corretamente', () => {
      const parsed = parseDateCivil('11/09/2026');
      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(2026);
      expect(parsed?.getMonth()).toBe(8); // Setembro = 8 (0-indexed)
      expect(parsed?.getDate()).toBe(11);
    });

    it('deve converter objeto Date preservando a data civil', () => {
      const d = new Date(2026, 8, 11, 23, 59, 59);
      const parsed = parseDateCivil(d);
      expect(parsed?.getDate()).toBe(11);
      expect(parsed?.getMonth()).toBe(8);
      expect(parsed?.getFullYear()).toBe(2026);
    });

    it('deve retornar null para entrada inválida', () => {
      expect(parseDateCivil('')).toBeNull();
      expect(parseDateCivil(null)).toBeNull();
      expect(parseDateCivil('invalido')).toBeNull();
    });
  });

  describe('Hierarquia de 4 Cores e Regra de Bloqueio Estrito', () => {
    it('🟢 +30 dias: deve classificar como GREEN e permitir início de viagem', () => {
      // 45 dias no futuro
      const futureDate = new Date(2026, 9, 25);
      const status = getDocumentExpirationStatus(futureDate, baseDate);

      expect(status.level).toBe('GREEN');
      expect(status.canStartTrip).toBe(true);
      expect(status.isExpired).toBe(false);
      expect(status.bannerVisible).toBe(false);
    });

    it('🟡 30 a 8 dias: deve classificar como YELLOW e exibir banner de atenção', () => {
      // 15 dias no futuro (25/09/2026)
      const date15Days = new Date(2026, 8, 25);
      const status = getDocumentExpirationStatus(date15Days, baseDate);

      expect(status.level).toBe('YELLOW');
      expect(status.daysRemaining).toBe(15);
      expect(status.canStartTrip).toBe(true);
      expect(status.bannerVisible).toBe(true);
      expect(status.badgeText).toBe('Vence em 15 dias');
    });

    it('🟠 7 a 2 dias: deve classificar como ORANGE e exibir alerta crítico', () => {
      // 5 dias no futuro (15/09/2026)
      const date5Days = new Date(2026, 8, 15);
      const status = getDocumentExpirationStatus(date5Days, baseDate);

      expect(status.level).toBe('ORANGE');
      expect(status.daysRemaining).toBe(5);
      expect(status.canStartTrip).toBe(true);
      expect(status.bannerVisible).toBe(true);
      expect(status.badgeText).toBe('Vence em 5 dias');
    });

    it('🔴 Caso do Gael: CNH vence em 11/09/2026 (1 dia restante em 10/09) -> DEVE BLOQUEAR VIAGEM', () => {
      const gaelCnh = '11/09/2026';
      const status = getDocumentExpirationStatus(gaelCnh, baseDate);

      expect(status.level).toBe('RED');
      expect(status.daysRemaining).toBe(1);
      expect(status.isExpired).toBe(false);
      expect(status.canStartTrip).toBe(false); // BLOQUEIO ESTRITO
      expect(status.bannerVisible).toBe(true);
      expect(status.badgeText).toBe('Vence em 1 dia');
      expect(status.bannerTitle).toContain('vence amanhã');
      expect(status.blockReason).not.toBeNull();
    });

    it('🔴 Vence hoje (0 dias) -> DEVE BLOQUEAR VIAGEM', () => {
      const todayCnh = new Date(2026, 8, 10);
      const status = getDocumentExpirationStatus(todayCnh, baseDate);

      expect(status.level).toBe('RED');
      expect(status.daysRemaining).toBe(0);
      expect(status.canStartTrip).toBe(false);
      expect(status.badgeText).toBe('Vence Hoje');
    });

    it('🔴 CNH já vencida (-2 dias) -> DEVE BLOQUEAR VIAGEM', () => {
      const pastCnh = new Date(2026, 8, 8);
      const status = getDocumentExpirationStatus(pastCnh, baseDate);

      expect(status.level).toBe('RED');
      expect(status.daysRemaining).toBe(-2);
      expect(status.isExpired).toBe(true);
      expect(status.canStartTrip).toBe(false);
      expect(status.badgeText).toBe('CNH Vencida');
    });

    it('Prioriza dias do backend quando informados', () => {
      const status = getDocumentExpirationStatus(null, baseDate, 1);
      expect(status.level).toBe('RED');
      expect(status.canStartTrip).toBe(false);
      expect(status.daysRemaining).toBe(1);
    });
  });
});
