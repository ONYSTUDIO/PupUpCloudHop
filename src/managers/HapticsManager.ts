import { Capacitor } from '@capacitor/core';
import { HAPTICS_CONFIG } from '@config/hapticsConfig';

export type HapticEventType = 'JUMP' | 'GAME_OVER';

type HapticsModule = {
  haptics: { impact: (o: unknown) => Promise<void>; notification: (o: unknown) => Promise<void> };
  impactStyle: Record<string, unknown>;
  notifType: Record<string, unknown>;
};

export class HapticsManager {
  private enabled: boolean;
  private nativeModule: HapticsModule | null = null;
  private moduleLoading = false;

  constructor(enabled: boolean) {
    this.enabled = enabled;
    if (Capacitor.isNativePlatform()) {
      void this.preloadNativeModule();
    }
  }

  private async preloadNativeModule(): Promise<void> {
    if (this.nativeModule || this.moduleLoading) return;
    this.moduleLoading = true;
    try {
      // @ts-expect-error — @capacitor/haptics is an optional native dependency
      const mod = await (import(/* @vite-ignore */ '@capacitor/haptics') as Promise<Record<string, Record<string, unknown>>>);
      this.nativeModule = {
        haptics: mod['Haptics'] as HapticsModule['haptics'],
        impactStyle: mod['ImpactStyle'] as Record<string, unknown>,
        notifType: mod['NotificationType'] as Record<string, unknown>,
      };
    } catch (e) {
      console.warn('[HapticsManager] native module preload failed', e);
    } finally {
      this.moduleLoading = false;
    }
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
      if (!this.nativeModule) {
        await this.preloadNativeModule();
      }
      if (!this.nativeModule) return;
      const { haptics, impactStyle, notifType } = this.nativeModule;
      if (type === 'JUMP') {
        await haptics.impact({ style: impactStyle[HAPTICS_CONFIG.JUMP.nativeImpactStyle] });
      } else {
        await haptics.notification({ type: notifType[HAPTICS_CONFIG.GAME_OVER.nativeNotifType] });
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
