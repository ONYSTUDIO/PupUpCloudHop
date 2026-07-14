import Phaser from 'phaser';

export class AudioManager {
  private scene: Phaser.Scene;
  private bgm: Phaser.Sound.BaseSound | null = null;
  private soundEnabled: boolean;

  constructor(scene: Phaser.Scene, soundEnabled: boolean = true) {
    this.scene = scene;
    this.soundEnabled = soundEnabled;
  }

  playBgm(key: string): void {
    if (this.bgm?.isPlaying) return;
    if (!this.soundEnabled) return;
    if (!this.scene.cache.audio.has(key)) return;
    this.bgm = this.scene.sound.add(key, { loop: true, volume: 0.5 });
    this.bgm.play();
  }

  stopBgm(): void {
    this.bgm?.stop();
    this.bgm = null;
  }

  playSfx(key: string, volume: number = 1.0): void {
    if (!this.soundEnabled) return;
    if (!this.scene.cache.audio.has(key)) return;
    this.scene.sound.play(key, { volume });
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    this.scene.sound.setMute(!enabled);
  }

  isSoundEnabled(): boolean {
    return this.soundEnabled;
  }
}
