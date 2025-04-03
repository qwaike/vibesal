// Audio.js - Game audio management
export class AudioManager {
    constructor() {
        this.sounds = {};
        this.music = null;
        this.volume = 0.5;
        this.musicVolume = 0.3;
        this.soundsEnabled = true;
        this.musicEnabled = true;
        
        this.initSounds();
    }
    
    initSounds() {
        // Define common sounds
        this.loadSound('footstep', 'sounds/footstep.mp3');
        this.loadSound('paperRustle', 'sounds/paper_rustle.mp3');
        this.loadSound('stampSound', 'sounds/stamp.mp3');
        this.loadSound('promotionSound', 'sounds/promotion.mp3');
        this.loadSound('errorSound', 'sounds/error.mp3');
        
        // Load background music
        this.loadMusic('sounds/office_ambience.mp3');
    }
    
    loadSound(name, path) {
        try {
            const audio = new Audio(path);
            audio.volume = this.volume;
            this.sounds[name] = audio;
        } catch (e) {
            console.error(`Failed to load sound: ${path}`, e);
        }
    }
    
    loadMusic(path) {
        try {
            this.music = new Audio(path);
            this.music.volume = this.musicVolume;
            this.music.loop = true;
        } catch (e) {
            console.error(`Failed to load music: ${path}`, e);
        }
    }
    
    playSound(name) {
        if (!this.soundsEnabled || !this.sounds[name]) return;
        
        // Create a new audio instance to allow for overlapping sounds
        const sound = this.sounds[name].cloneNode();
        sound.volume = this.volume;
        sound.play()
            .catch(e => console.warn(`Error playing sound ${name}:`, e));
    }
    
    playMusic() {
        if (!this.musicEnabled || !this.music) return;
        
        this.music.play()
            .catch(e => console.warn('Error playing music:', e));
    }
    
    pauseMusic() {
        if (this.music) {
            this.music.pause();
        }
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        
        // Update all loaded sounds
        for (const sound in this.sounds) {
            if (this.sounds.hasOwnProperty(sound)) {
                this.sounds[sound].volume = this.volume;
            }
        }
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        
        if (this.music) {
            this.music.volume = this.musicVolume;
        }
    }
    
    toggleSounds() {
        this.soundsEnabled = !this.soundsEnabled;
        return this.soundsEnabled;
    }
    
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        
        if (this.musicEnabled && this.music) {
            this.playMusic();
        } else if (!this.musicEnabled && this.music) {
            this.pauseMusic();
        }
        
        return this.musicEnabled;
    }
} 