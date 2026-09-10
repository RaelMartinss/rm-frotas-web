import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';

@Injectable({
  providedIn: 'root',
})
export class BiometricAuthService {
  async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const result = await BiometricAuth.checkBiometry();
      return result.isAvailable && result.biometryType !== BiometryType.none;
    } catch {
      return false;
    }
  }

  async verify(
    reason = 'Confirme sua identidade para continuar',
  ): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      await BiometricAuth.authenticate({
        reason,
        cancelTitle: 'Entrar com senha',
      });
      return true;
    } catch {
      return false;
    }
  }
}
