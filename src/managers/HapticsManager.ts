import { Capacitor } from '@capacitor/core';
import { HAPTICS_CONFIG } from '@config/hapticsConfig';

export type HapticEventType = 'JUMP' | 'GAME_OVER';

export class HapticsManager {
  private enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  vibrate(type: HapticEventType): void {
    if (!this.enabled) return;
    if (Capacitor.isNativePlatform()) {
      void this.vibrateNative(type);
    } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      this.vibrateWeb(type);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private async vibrateNative(type: HapticEventType): Promise<void> {
    try {
      // @ts-expect-error — @capacitor/haptics is an optional native dependency
      const mod = await (import(/* @vite-ignore */ '@capacitor/haptics') as Promise<Record<string, Record<string, unknown>>>);
      const haptics = mod['Haptics'] as { impact: (o: unknown) => Promise<void>; notification: (o: unknown) => Promise<void> };
      const impactStyle = mod['ImpactStyle'] as Record<string, unknown>;
      const notifType = mod['NotificationType'] as Record<string, unknown>;
      if (type === 'JUMP') {
        await haptics.impact({ style: impactStyle['Medium'] });
      } else {
        await haptics.notification({ type: notifType['Error'] });
      }
    } catch (e) {
      console.warn('[HapticsManager] native vibrate failed', e);
    }
  }

  private vibrateWeb(type: HapticEventType): void {
    if (type === 'JUMP') {
      navigator.vibrate(HAPTICS_CONFIG.JUMP.webDuration);
    } else {
      navigator.vibrate(HAPTICS_CONFIG.GAME_OVER.webPattern);
    }
  }
}
