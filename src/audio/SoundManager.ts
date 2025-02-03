export class SoundManager {
  private static instance: SoundManager;
  private sounds: Map<string, HTMLAudioElement>;
  private currentTheme?: HTMLAudioElement;
  private walkingSound?: HTMLAudioElement;
  private walkingPlaybackRate: number = 1;
  private isInitialized: boolean = false;

  private constructor() {
    this.sounds = new Map();
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await Promise.all([
        this.loadSound('theme', '/sounds/theme.mp3'),
        this.loadSound('overworld', '/sounds/overworld.mp3'),
        this.loadSound('walking', '/sounds/walking.mp3')
      ]);
      
      this.isInitialized = true;
    } catch (error) {
      // No error logging
    }
  }

  private async loadSound(key: string, path: string): Promise<void> {
    try {
      const audio = new Audio();
      
      // Create a promise that resolves when the audio is loaded
      const loadPromise = new Promise<void>((resolve, reject) => {
        audio.addEventListener('canplaythrough', () => resolve(), { once: true });
        audio.addEventListener('error', () => reject(new Error(`Failed to load audio: ${path}`)), { once: true });
      });

      // Set the source and start loading
      audio.src = path;
      audio.load();

      // Wait for the audio to load
      await loadPromise;
      
      this.sounds.set(key, audio);
    } catch (error) {
      // No error logging for sound loading
      throw error;
    }
  }

  public async playTheme(theme: 'theme' | 'overworld'): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Stop current theme if playing
      if (this.currentTheme) {
        this.currentTheme.pause();
        this.currentTheme.currentTime = 0;
      }

      const sound = this.sounds.get(theme);
      if (sound) {
        sound.loop = true;
        // Different volumes for different themes
        sound.volume = theme === 'overworld' ? 0.1 : 0.4;
        await sound.play();
        this.currentTheme = sound;
      }
    } catch (error) {
      // No theme error logging
    }
  }

  public async startWalking(isRunning: boolean = false): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const walkingSound = this.sounds.get('walking');
      if (!walkingSound) return;

      if (!this.walkingSound) {
        walkingSound.loop = true;
        walkingSound.volume = 0.6; // Increased walking volume
        this.walkingSound = walkingSound;
      }

      this.walkingPlaybackRate = isRunning ? 1.5 : 1;
      this.walkingSound.playbackRate = this.walkingPlaybackRate;
      
      if (this.walkingSound.paused) {
        await this.walkingSound.play();
      }
    } catch (error) {
      // No walking sound error logging
    }
  }

  public stopWalking(): void {
    if (this.walkingSound && !this.walkingSound.paused) {
      this.walkingSound.pause();
      this.walkingSound.currentTime = 0;
    }
  }

  public stopAll(): void {
    this.sounds.forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
    this.currentTheme = undefined;
    this.walkingSound = undefined;
  }
} 