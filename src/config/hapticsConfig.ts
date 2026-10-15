export const HAPTICS_CONFIG = {
  JUMP: {
    webDuration: 45,
  },
  GAME_OVER: {
    webPattern: [80, 50, 80] as number[],
  },
  LANDING_SHAKE: {
    duration: 80,
    intensity: 0.004,
  },
} as const;
