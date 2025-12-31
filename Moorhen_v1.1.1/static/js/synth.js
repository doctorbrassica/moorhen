/**
 * Moorhen - Sound Synthesis Engine
 * Web Audio API based synthesizer with organic wetland sounds
 */

class MoorhenSynth {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.masterFilter = null;
        this.reverbNode = null;
        this.delayNode = null;
        this.activeVoices = new Map();
        this.droneVoices = [];
        this.isInitialized = false;
        this.droneActive = false;
        this.droneBaseTone = 0; // Semitones offset
        
        // Atmosphere sounds
        this.windNode = null;
        this.waterNode = null;
        this.windVolume = 0;
        this.waterVolume = 0;
        
        // Sequencer state
        this.sequencer = {
            isPlaying: false,
            currentStep: 0,
            bpm: 120,
            randomness: 0,
            intervalId: null,
            bowls: Array(16).fill(null).map((_, i) => ({ noteIndex: i % 7, active: false })),
            wind: Array(16).fill(null).map((_, i) => ({ noteIndex: i % 7, active: false })),
            strings: Array(16).fill(null).map((_, i) => ({ noteIndex: i % 7, active: false })),
            horn: Array(16).fill(null).map((_, i) => ({ noteIndex: i % 7, active: false })),
            moorhen: Array(16).fill(null).map((_, i) => ({ noteIndex: i % 7, active: false })),
            oystercatcher: Array(16).fill(null).map((_, i) => ({ noteIndex: i % 7, active: false }))
        };
        
        // Instrument volumes
        this.instrumentVolumes = {
            bowls: 0.7,
            wind: 0.6,
            strings: 0.7,
            horn: 0.6,
            moorhen: 0.5,
            oystercatcher: 0.4
        };
        
        // Pentatonic scale (meditation)
        this.scales = {
            meditation: [130.81, 155.56, 174.61, 196.00, 233.08, 261.63, 311.13]
        };
        
        this.currentScale = 'meditation';
        this.filterFreq = 2000;
        this.reverbMix = 0.5;
        this.pitchBend = 0;
    }
    
    async init() {
        if (this.isInitialized) return;
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Master gain
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.7;
        
        // Master filter (controlled by expression pad X axis)
        this.masterFilter = this.audioContext.createBiquadFilter();
        this.masterFilter.type = 'lowpass';
        this.masterFilter.frequency.value = this.filterFreq;
        this.masterFilter.Q.value = 1;
        
        // Create reverb
        this.reverbNode = await this.createReverb();
        
        // Create delay
        this.delayNode = this.audioContext.createDelay(1.0);
        this.delayNode.delayTime.value = 0.3;
        
        const delayFeedback = this.audioContext.createGain();
        delayFeedback.gain.value = 0.3;
        
        const delayFilter = this.audioContext.createBiquadFilter();
        delayFilter.type = 'lowpass';
        delayFilter.frequency.value = 2000;
        
        // Connect delay chain
        this.delayNode.connect(delayFilter);
        delayFilter.connect(delayFeedback);
        delayFeedback.connect(this.delayNode);
        
        // Connect master output chain: masterGain -> masterFilter -> reverb/delay -> destination
        this.masterGain.connect(this.masterFilter);
        this.masterFilter.connect(this.reverbNode);
        this.masterFilter.connect(this.delayNode);
        this.delayNode.connect(this.audioContext.destination);
        this.reverbNode.connect(this.audioContext.destination);
        
        this.isInitialized = true;
    }
    
    async createReverb() {
        const convolver = this.audioContext.createConvolver();
        const length = this.audioContext.sampleRate * 3;
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
            }
        }
        
        convolver.buffer = impulse;
        
        const reverbGain = this.audioContext.createGain();
        reverbGain.gain.value = this.reverbMix;
        convolver.connect(reverbGain);
        
        this.reverbGain = reverbGain;
        return convolver;
    }
    
    // Note name helper
    getNoteName(freq) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const a4 = 440;
        const semitones = 12 * Math.log2(freq / a4);
        const noteIndex = Math.round(semitones) + 69;
        const octave = Math.floor(noteIndex / 12) - 1;
        const note = noteNames[noteIndex % 12];
        return `${note}${octave}`;
    }
    
    // Singing bowl voice
    createBowlVoice(freq, time) {
        const voice = {};
        const baseFreq = freq * Math.pow(2, this.pitchBend / 12);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.4 * this.instrumentVolumes.bowls, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 4);
        
        // Fundamental
        const osc1 = this.audioContext.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(baseFreq, time);
        
        // First partial
        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(baseFreq * 2.71, time);
        
        // Second partial
        const osc3 = this.audioContext.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(baseFreq * 5.4, time);
        
        const gain2 = this.audioContext.createGain();
        gain2.gain.value = 0.3;
        const gain3 = this.audioContext.createGain();
        gain3.gain.value = 0.15;
        
        osc1.connect(gain);
        osc2.connect(gain2);
        gain2.connect(gain);
        osc3.connect(gain3);
        gain3.connect(gain);
        
        gain.connect(this.masterGain);
        
        osc1.start(time);
        osc2.start(time);
        osc3.start(time);
        osc1.stop(time + 4);
        osc2.stop(time + 4);
        osc3.stop(time + 4);
        
        voice.oscillators = [osc1, osc2, osc3];
        voice.gain = gain;
        return voice;
    }
    
    // Bansuri (flute) voice
    createBansuriVoice(freq, time) {
        const voice = {};
        const baseFreq = freq * Math.pow(2, this.pitchBend / 12);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3 * this.instrumentVolumes.wind, time + 0.15);
        gain.gain.setValueAtTime(0.25 * this.instrumentVolumes.wind, time + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 2);
        
        // Main tone (sine)
        const osc1 = this.audioContext.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(baseFreq, time);
        
        // Breathy noise
        const noise = this.audioContext.createBufferSource();
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 2, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        noise.buffer = noiseBuffer;
        
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = baseFreq * 2;
        noiseFilter.Q.value = 5;
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(0, time);
        noiseGain.gain.linearRampToValueAtTime(0.08 * this.instrumentVolumes.wind, time + 0.1);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 1.5);
        
        // Vibrato
        const vibrato = this.audioContext.createOscillator();
        vibrato.frequency.value = 5;
        const vibratoGain = this.audioContext.createGain();
        vibratoGain.gain.value = 3;
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc1.frequency);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(gain);
        osc1.connect(gain);
        gain.connect(this.masterGain);
        
        osc1.start(time);
        noise.start(time);
        vibrato.start(time);
        osc1.stop(time + 2);
        noise.stop(time + 2);
        vibrato.stop(time + 2);
        
        voice.oscillators = [osc1, vibrato];
        voice.gain = gain;
        return voice;
    }
    
    // Sitar voice
    createSitarVoice(freq, time) {
        const voice = {};
        const baseFreq = freq * Math.pow(2, this.pitchBend / 12);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.5 * this.instrumentVolumes.strings, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.2 * this.instrumentVolumes.strings, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 3);
        
        // Main oscillator (sawtooth for richness)
        const osc1 = this.audioContext.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(baseFreq * 1.01, time);
        osc1.frequency.exponentialRampToValueAtTime(baseFreq, time + 0.05);
        
        // Sympathetic string
        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(baseFreq * 2, time);
        
        const osc2Gain = this.audioContext.createGain();
        osc2Gain.gain.setValueAtTime(0.15, time);
        osc2Gain.gain.exponentialRampToValueAtTime(0.001, time + 2);
        
        // Resonance filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = baseFreq * 3;
        filter.Q.value = 10;
        
        osc1.connect(filter);
        osc2.connect(osc2Gain);
        osc2Gain.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + 3);
        osc2.stop(time + 3);
        
        voice.oscillators = [osc1, osc2];
        voice.gain = gain;
        return voice;
    }
    
    // Tibetan long horn (Dungchen)
    createHornVoice(freq, time) {
        const voice = {};
        const baseFreq = (freq / 2) * Math.pow(2, this.pitchBend / 12);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.4 * this.instrumentVolumes.horn, time + 0.5);
        gain.gain.setValueAtTime(0.35 * this.instrumentVolumes.horn, time + 1);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 4);
        
        // Fundamental (low drone)
        const osc1 = this.audioContext.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(baseFreq, time);
        
        // Overtones
        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(baseFreq * 2, time);
        
        const osc3 = this.audioContext.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(baseFreq * 3, time);
        
        const osc2Gain = this.audioContext.createGain();
        osc2Gain.gain.value = 0.3;
        const osc3Gain = this.audioContext.createGain();
        osc3Gain.gain.value = 0.15;
        
        // Low pass filter for brass character
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, time);
        filter.frequency.linearRampToValueAtTime(800, time + 0.3);
        filter.frequency.linearRampToValueAtTime(400, time + 2);
        filter.Q.value = 2;
        
        osc1.connect(filter);
        osc2.connect(osc2Gain);
        osc2Gain.connect(filter);
        osc3.connect(osc3Gain);
        osc3Gain.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        osc1.start(time);
        osc2.start(time);
        osc3.start(time);
        osc1.stop(time + 4);
        osc2.stop(time + 4);
        osc3.stop(time + 4);
        
        voice.oscillators = [osc1, osc2, osc3];
        voice.gain = gain;
        return voice;
    }
    
    // Moorhen call
    createMoorhenVoice(freq, time) {
        const voice = {};
        const baseFreq = freq * 2 * Math.pow(2, this.pitchBend / 12);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.5 * this.instrumentVolumes.moorhen, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.3 * this.instrumentVolumes.moorhen, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
        
        // Main chirp oscillator
        const osc1 = this.audioContext.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(baseFreq, time);
        osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, time + 0.15);
        osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, time + 0.4);
        
        // Harmonic
        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(baseFreq * 1.5, time);
        osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, time + 0.2);
        
        const osc2Gain = this.audioContext.createGain();
        osc2Gain.gain.value = 0.3;
        
        // Vibrato for bird-like warble
        const vibrato = this.audioContext.createOscillator();
        vibrato.frequency.value = 20;
        const vibratoGain = this.audioContext.createGain();
        vibratoGain.gain.value = baseFreq * 0.05;
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc1.frequency);
        
        osc1.connect(gain);
        osc2.connect(osc2Gain);
        osc2Gain.connect(gain);
        gain.connect(this.masterGain);
        
        osc1.start(time);
        osc2.start(time);
        vibrato.start(time);
        osc1.stop(time + 0.8);
        osc2.stop(time + 0.8);
        vibrato.stop(time + 0.8);
        
        voice.oscillators = [osc1, osc2, vibrato];
        voice.gain = gain;
        return voice;
    }
    
    // Oystercatcher call (neep-need high pitched)
    createOystercatcherVoice(freq, time) {
        const voice = {};
        const baseFreq = freq * 4 * Math.pow(2, this.pitchBend / 12);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, time);
        
        // First "neep" - rising
        gain.gain.linearRampToValueAtTime(0.6 * this.instrumentVolumes.oystercatcher, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.1 * this.instrumentVolumes.oystercatcher, time + 0.12);
        // Second "need" - higher, falling
        gain.gain.linearRampToValueAtTime(0.7 * this.instrumentVolumes.oystercatcher, time + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
        
        // Main piercing tone
        const osc1 = this.audioContext.createOscillator();
        osc1.type = 'sine';
        // "neep" up
        osc1.frequency.setValueAtTime(baseFreq, time);
        osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, time + 0.08);
        // gap
        osc1.frequency.setValueAtTime(baseFreq * 1.5, time + 0.14);
        // "need" down
        osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.1, time + 0.35);
        
        // Harmonic overtone
        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(baseFreq * 2, time);
        osc2.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, time + 0.08);
        osc2.frequency.setValueAtTime(baseFreq * 3, time + 0.14);
        osc2.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, time + 0.35);
        
        const osc2Gain = this.audioContext.createGain();
        osc2Gain.gain.value = 0.25;
        
        // High-pass filter for piercing quality
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1500;
        filter.Q.value = 3;
        
        osc1.connect(filter);
        osc2.connect(osc2Gain);
        osc2Gain.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + 0.5);
        osc2.stop(time + 0.5);
        
        voice.oscillators = [osc1, osc2];
        voice.gain = gain;
        return voice;
    }
    
    // Play note by instrument
    playNote(instrument, noteIndex) {
        if (!this.isInitialized) return;
        
        const freq = this.scales[this.currentScale][noteIndex];
        const time = this.audioContext.currentTime;
        
        let voice;
        switch (instrument) {
            case 'bowls':
                voice = this.createBowlVoice(freq, time);
                break;
            case 'wind':
                voice = this.createBansuriVoice(freq, time);
                break;
            case 'strings':
                voice = this.createSitarVoice(freq, time);
                break;
            case 'horn':
                voice = this.createHornVoice(freq, time);
                break;
            case 'moorhen':
                voice = this.createMoorhenVoice(freq, time);
                break;
            case 'oystercatcher':
                voice = this.createOystercatcherVoice(freq, time);
                break;
            default:
                voice = this.createBowlVoice(freq, time);
        }
        
        return voice;
    }
    
    // Drone
    startDrone(volume = 0.3) {
        if (!this.isInitialized || this.droneActive) return;
        
        const baseFreq = 65.41 * Math.pow(2, this.droneBaseTone / 12); // C2 adjusted
        const time = this.audioContext.currentTime;
        
        // Drone fundamental
        const osc1 = this.audioContext.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = baseFreq;
        
        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = baseFreq * 2;
        
        const osc3 = this.audioContext.createOscillator();
        osc3.type = 'triangle';
        osc3.frequency.value = baseFreq * 3;
        
        const gain1 = this.audioContext.createGain();
        gain1.gain.setValueAtTime(0, time);
        gain1.gain.linearRampToValueAtTime(volume, time + 2);
        
        const gain2 = this.audioContext.createGain();
        gain2.gain.value = 0.3;
        
        const gain3 = this.audioContext.createGain();
        gain3.gain.value = 0.15;
        
        // LFO for subtle movement
        const lfo = this.audioContext.createOscillator();
        lfo.frequency.value = 0.1;
        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 1;
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        
        osc1.connect(gain1);
        osc2.connect(gain2);
        gain2.connect(gain1);
        osc3.connect(gain3);
        gain3.connect(gain1);
        gain1.connect(this.masterGain);
        
        osc1.start();
        osc2.start();
        osc3.start();
        lfo.start();
        
        this.droneVoices = [
            { osc: osc1, gain: gain1 },
            { osc: osc2, gain: gain2 },
            { osc: osc3, gain: gain3 },
            { osc: lfo, gain: lfoGain }
        ];
        
        this.droneActive = true;
        this.droneVolume = volume;
    }
    
    stopDrone() {
        if (!this.droneActive) return;
        
        const time = this.audioContext.currentTime;
        
        this.droneVoices.forEach(voice => {
            if (voice.gain && voice.gain.gain) {
                voice.gain.gain.linearRampToValueAtTime(0, time + 1);
            }
            setTimeout(() => {
                try {
                    voice.osc.stop();
                } catch (e) {}
            }, 1200);
        });
        
        this.droneActive = false;
        this.droneVoices = [];
    }
    
    setDroneVolume(volume) {
        this.droneVolume = volume;
        if (this.droneActive && this.droneVoices.length > 0) {
            const time = this.audioContext.currentTime;
            this.droneVoices[0].gain.gain.linearRampToValueAtTime(volume, time + 0.1);
        }
    }
    
    setDroneBaseTone(semitones) {
        this.droneBaseTone = semitones;
        if (this.droneActive) {
            const baseFreq = 65.41 * Math.pow(2, semitones / 12);
            const time = this.audioContext.currentTime;
            if (this.droneVoices.length >= 3) {
                this.droneVoices[0].osc.frequency.linearRampToValueAtTime(baseFreq, time + 0.5);
                this.droneVoices[1].osc.frequency.linearRampToValueAtTime(baseFreq * 2, time + 0.5);
                this.droneVoices[2].osc.frequency.linearRampToValueAtTime(baseFreq * 3, time + 0.5);
            }
        }
    }
    
    // Wind sound
    startWind() {
        if (this.windNode) return;
        
        const noise = this.audioContext.createBufferSource();
        const bufferSize = this.audioContext.sampleRate * 10;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        noise.buffer = buffer;
        noise.loop = true;
        
        // Wind filter (bandpass for whooshing)
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 400;
        filter.Q.value = 0.5;
        
        // LFO for wind variation
        const lfo = this.audioContext.createOscillator();
        lfo.frequency.value = 0.15;
        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 200;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        
        const gain = this.audioContext.createGain();
        gain.gain.value = 0;
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        noise.start();
        lfo.start();
        
        this.windNode = { noise, filter, gain, lfo };
    }
    
    setWindVolume(volume) {
        this.windVolume = volume;
        if (volume > 0 && !this.windNode) {
            this.startWind();
        }
        if (this.windNode) {
            const time = this.audioContext.currentTime;
            this.windNode.gain.gain.linearRampToValueAtTime(volume * 0.15, time + 0.5);
        }
    }
    
    // Water sound
    startWater() {
        if (this.waterNode) return;
        
        const noise = this.audioContext.createBufferSource();
        const bufferSize = this.audioContext.sampleRate * 10;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        noise.buffer = buffer;
        noise.loop = true;
        
        // Water filter (higher, more trickling)
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 1;
        
        // LFO for water ripple variation
        const lfo = this.audioContext.createOscillator();
        lfo.frequency.value = 0.3;
        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 500;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        
        // Second layer - lower gurgle
        const noise2 = this.audioContext.createBufferSource();
        noise2.buffer = buffer;
        noise2.loop = true;
        
        const filter2 = this.audioContext.createBiquadFilter();
        filter2.type = 'lowpass';
        filter2.frequency.value = 300;
        filter2.Q.value = 2;
        
        const gain = this.audioContext.createGain();
        gain.gain.value = 0;
        
        const gain2 = this.audioContext.createGain();
        gain2.gain.value = 0.5;
        
        noise.connect(filter);
        filter.connect(gain);
        noise2.connect(filter2);
        filter2.connect(gain2);
        gain2.connect(gain);
        gain.connect(this.masterGain);
        
        noise.start();
        noise2.start();
        lfo.start();
        
        this.waterNode = { noise, noise2, filter, filter2, gain, lfo };
    }
    
    setWaterVolume(volume) {
        this.waterVolume = volume;
        if (volume > 0 && !this.waterNode) {
            this.startWater();
        }
        if (this.waterNode) {
            const time = this.audioContext.currentTime;
            this.waterNode.gain.gain.linearRampToValueAtTime(volume * 0.12, time + 0.5);
        }
    }
    
    // Filter control (expression pad X axis)
    setFilter(freq) {
        this.filterFreq = freq;
        if (this.masterFilter) {
            this.masterFilter.frequency.linearRampToValueAtTime(freq, this.audioContext.currentTime + 0.05);
        }
    }
    
    // Reverb control
    setReverb(mix) {
        this.reverbMix = mix;
        if (this.reverbGain) {
            this.reverbGain.gain.linearRampToValueAtTime(mix, this.audioContext.currentTime + 0.1);
        }
    }
    
    // Master volume
    setMasterVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.1);
        }
    }
    
    // Instrument volume
    setInstrumentVolume(instrument, volume) {
        this.instrumentVolumes[instrument] = volume;
    }
    
    // Pitch bend
    setPitchBend(semitones) {
        this.pitchBend = semitones;
    }
    
    // Sequencer
    startSequencer() {
        if (this.sequencer.isPlaying) return;
        
        this.sequencer.isPlaying = true;
        this.sequencer.currentStep = 0;
        
        const stepDuration = 60000 / this.sequencer.bpm / 4; // 16th notes
        
        this.sequencer.intervalId = setInterval(() => {
            this.playSequencerStep();
        }, stepDuration);
    }
    
    stopSequencer() {
        if (!this.sequencer.isPlaying) return;
        
        this.sequencer.isPlaying = false;
        if (this.sequencer.intervalId) {
            clearInterval(this.sequencer.intervalId);
            this.sequencer.intervalId = null;
        }
    }
    
    playSequencerStep() {
        // Determine which step to play based on randomness
        let playStep = this.sequencer.currentStep;
        
        // For each instrument, potentially randomize which step to play
        const instruments = ['bowls', 'wind', 'strings', 'horn', 'moorhen', 'oystercatcher'];
        instruments.forEach(inst => {
            // Randomness affects step selection per instrument per beat
            let stepToPlay;
            if (Math.random() < this.sequencer.randomness) {
                stepToPlay = Math.floor(Math.random() * 16);
            } else {
                stepToPlay = this.sequencer.currentStep;
            }
            
            const stepData = this.sequencer[inst][stepToPlay];
            if (stepData && stepData.active) {
                this.playNote(inst, stepData.noteIndex);
            }
        });
        
        // Notify UI with current sequential position (for visual tracking)
        if (this.onStepChange) {
            this.onStepChange(this.sequencer.currentStep);
        }
        
        // Advance step
        this.sequencer.currentStep = (this.sequencer.currentStep + 1) % 16;
    }
    
    setSequencerTempo(bpm) {
        this.sequencer.bpm = bpm;
        if (this.sequencer.isPlaying) {
            this.stopSequencer();
            this.startSequencer();
        }
    }
    
    setSequencerRandomness(value) {
        this.sequencer.randomness = value;
    }
}

// Create global instance
const synth = new MoorhenSynth();
