import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INACTIVITY_TIMEOUT_MINUTES,
  InactivityGuardService,
} from './inactivity-guard.service';

describe('InactivityGuardService', () => {
  let service: InactivityGuardService;

  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    service = new InactivityGuardService();
  });

  afterEach(() => {
    service.stop();
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('não deve travar e nem iniciar o timer se o role for DRIVER', () => {
    service.start('DRIVER');
    vi.advanceTimersByTime(INACTIVITY_TIMEOUT_MINUTES * 60 * 1000 + 1000);

    expect(service.isLocked()).toBe(false);
  });

  it('deve travar após 15 minutos de inatividade para FLEET_MANAGER', () => {
    service.start('FLEET_MANAGER');
    expect(service.isLocked()).toBe(false);

    vi.advanceTimersByTime(INACTIVITY_TIMEOUT_MINUTES * 60 * 1000);

    expect(service.isLocked()).toBe(true);
    expect(sessionStorage.getItem('sessionLocked')).toBe('true');
  });

  it('deve reiniciar o timer quando registrar atividade', () => {
    service.start('ADMIN');

    // Avança 10 minutos (ainda não travou)
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(service.isLocked()).toBe(false);

    // Registra atividade (reseta para mais 15 minutos)
    service.registerActivity();

    // Avança mais 10 minutos (total 20 min desde o start, mas 10 min desde a atividade)
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(service.isLocked()).toBe(false);

    // Avança mais 5 minutos (15 min desde a última atividade)
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(service.isLocked()).toBe(true);
  });

  it('não deve destravar por atividade de mouse quando já estiver bloqueado', () => {
    service.start('FLEET_MANAGER');
    service.lock();
    expect(service.isLocked()).toBe(true);

    service.registerActivity();
    expect(service.isLocked()).toBe(true);
  });

  it('deve destravar com sucesso e limpar o sessionStorage no unlock()', () => {
    service.start('FLEET_MANAGER');
    service.lock();
    expect(service.isLocked()).toBe(true);

    service.unlock();
    expect(service.isLocked()).toBe(false);
    expect(sessionStorage.getItem('sessionLocked')).toBeNull();
  });

  it('deve restaurar estado travado se sessionStorage contiver sessionLocked: true', () => {
    sessionStorage.setItem('sessionLocked', 'true');
    service.start('ADMIN');

    expect(service.isLocked()).toBe(true);
  });
});
