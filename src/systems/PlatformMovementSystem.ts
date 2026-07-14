import type { CloudIsland } from '@entities/CloudIsland';

export class PlatformMovementSystem {
  private clouds: CloudIsland[] = [];

  register(cloud: CloudIsland): void {
    this.clouds.push(cloud);
  }

  unregister(cloud: CloudIsland): void {
    this.clouds = this.clouds.filter((c) => c !== cloud);
  }

  update(delta: number): void {
    for (const cloud of this.clouds) {
      cloud.update(delta);
    }
  }

  getAll(): CloudIsland[] {
    return this.clouds;
  }

  clear(): void {
    this.clouds = [];
  }
}
