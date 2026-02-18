import { Howl } from 'howler';

/**
 * Sound Manager for game audio
 * Uses Howler.js for cross-browser audio support
 */
class SoundManager {
  constructor() {
    this.sounds = {};
    this.muted = this.loadMutePreference();
    this.initialized = false;
    this.audioUnlocked = false;
  }

  /**
   * Initialize all game sounds
   * This should be called after user interaction to avoid autoplay restrictions
   */
  init() {
    if (this.initialized) return;

    // Define all sound files
    const soundConfig = {
      draw: {
        src: ['/sounds/draw.mp3'],
        volume: 0.6,
        sprite: {
          draw: [0, 4000] // Play only first 4 seconds
        }
      },
      tierS: {
        src: ['/sounds/tier-s.mp3'],
        volume: 0.7,
      },
      tierA: {
        src: ['/sounds/tier-a.mp3'],
        volume: 0.7,
      },
      tierB: {
        src: ['/sounds/tier-b.mp3'],
        volume: 0.6,
      },
      tierC: {
        src: ['/sounds/tier-c.mp3'],
        volume: 0.5,
      },
      tierD: {
        src: ['/sounds/tier-d.mp3'],
        volume: 0.5,
      },
      victory: {
        src: ['/sounds/victory.mp3'],
        volume: 0.7,
      },
      defeat: {
        src: ['/sounds/defeat.mp3'],
        volume: 0.6,
      },
    };

    // Create Howl instances for each sound
    Object.keys(soundConfig).forEach((key) => {
      const config = {
        src: soundConfig[key].src,
        volume: soundConfig[key].volume,
        preload: true,
        html5: false, // Use Web Audio API for better performance
        onloaderror: (id, error) => {
          console.warn(`Failed to load sound: ${key}`, error);
        },
        onplayerror: (id, error) => {
          console.warn(`Failed to play sound: ${key}`, error);
        },
      };

      // Add sprite if defined
      if (soundConfig[key].sprite) {
        config.sprite = soundConfig[key].sprite;
      }

      this.sounds[key] = new Howl(config);
    });

    this.initialized = true;
    console.log('Sound Manager initialized');
  }

  /**
   * Unlock audio context after user interaction
   * Required for iOS and some browsers with autoplay restrictions
   */
  unlockAudio() {
    if (this.audioUnlocked) return Promise.resolve();

    return new Promise((resolve) => {
      // Try to play a silent sound to unlock audio context
      const unlockSound = new Howl({
        src: ['data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'],
        volume: 0,
        onend: () => {
          this.audioUnlocked = true;
          console.log('Audio unlocked');
          resolve();
        },
        onloaderror: () => {
          this.audioUnlocked = true;
          resolve();
        },
      });

      unlockSound.play();

      // Fallback timeout
      setTimeout(() => {
        this.audioUnlocked = true;
        resolve();
      }, 100);
    });
  }

  /**
   * Play a sound by tier
   * @param {string} tier - S, A, B, C, or D
   */
  playTierSound(tier) {
    if (!this.initialized) this.init();
    if (this.muted) return;

    const soundKey = `tier${tier}`;
    const sound = this.sounds[soundKey];

    if (sound) {
      // Stop any currently playing instance of this sound
      sound.stop();
      sound.play();
    } else {
      console.warn(`Sound not found for tier: ${tier}`);
    }
  }

  /**
   * Play victory sound
   */
  playVictory() {
    if (!this.initialized) this.init();
    if (this.muted) return;

    if (this.sounds.victory) {
      this.sounds.victory.stop();
      this.sounds.victory.play();
    }
  }

  /**
   * Play defeat sound
   */
  playDefeat() {
    if (!this.initialized) this.init();
    if (this.muted) return;

    if (this.sounds.defeat) {
      this.sounds.defeat.stop();
      this.sounds.defeat.play();
    }
  }

  /**
   * Play draw sound (shuffle animation)
   * Automatically cuts at 4 seconds
   */
  playDraw() {
    if (!this.initialized) this.init();
    if (this.muted) return;

    if (this.sounds.draw) {
      this.sounds.draw.stop();

      // Try to play with sprite first
      const soundId = this.sounds.draw.play('draw');

      // Fallback: stop after 4 seconds if sprite doesn't work
      setTimeout(() => {
        if (this.sounds.draw) {
          this.sounds.draw.stop(soundId);
        }
      }, 4000);
    }
  }

  /**
   * Toggle mute state
   * @returns {boolean} New mute state
   */
  toggleMute() {
    this.muted = !this.muted;
    this.saveMutePreference(this.muted);

    // Mute/unmute all sounds
    Object.values(this.sounds).forEach((sound) => {
      sound.mute(this.muted);
    });

    return this.muted;
  }

  /**
   * Set mute state
   * @param {boolean} muted
   */
  setMuted(muted) {
    this.muted = muted;
    this.saveMutePreference(muted);

    // Mute/unmute all sounds
    Object.values(this.sounds).forEach((sound) => {
      sound.mute(muted);
    });
  }

  /**
   * Get current mute state
   * @returns {boolean}
   */
  isMuted() {
    return this.muted;
  }

  /**
   * Save mute preference to localStorage
   * @param {boolean} muted
   */
  saveMutePreference(muted) {
    try {
      localStorage.setItem('anifight_muted', JSON.stringify(muted));
    } catch (e) {
      console.warn('Failed to save mute preference', e);
    }
  }

  /**
   * Load mute preference from localStorage
   * @returns {boolean}
   */
  loadMutePreference() {
    try {
      const saved = localStorage.getItem('anifight_muted');
      return saved ? JSON.parse(saved) : false;
    } catch (e) {
      console.warn('Failed to load mute preference', e);
      return false;
    }
  }

  /**
   * Stop all sounds
   */
  stopAll() {
    Object.values(this.sounds).forEach((sound) => {
      sound.stop();
    });
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopAll();
    Object.values(this.sounds).forEach((sound) => {
      sound.unload();
    });
    this.sounds = {};
    this.initialized = false;
  }
}

// Create singleton instance
const soundManager = new SoundManager();

export default soundManager;
