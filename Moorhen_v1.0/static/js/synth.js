/**
 * Moorhen - Web Audio Synthesis Engine
 * Creates meditative drones, singing bowl tones, and ambient textures
 */

class HimalayanSynth {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.reverbNode = null;
        this.delayNode = null;
        this.activeVoices = new Map();
        this.droneVoices = [];
        this.isInitialized = false;
        
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
            randomness: 0, // 0 = sequential, 1 = fully random
            intervalId: null,
            // Each instrument has 16 steps: { noteIndex: 0-6, active: true/false }
            bowls: Array(16).fill(null).map((_, i) => ({ noteIndex: i % 7, active: false })),
            wind: Array(16).fill(null).map((_, i) => ({ noteIndex: i % 7, active: false })),
            strings: Array(16).fill(null).map((_, i) => ({ noteIndex: i % 7, active: false })),
            horn: Array(16).fill(null).map((_, i) => ({ noteIndex: i % 7, active: false })),
            moorhen: Array(16).fill(null).map((_, i) => ({ noteIndex: i % 7, active: false })),
            oystercatcher: Array(16).fill(null).map((_, i) => ({ noteIndex: i % 7, active: false }))
        };
        
        // Individual instrument volumes
        this.instrumentVolumes = {
            bowls: 0.7,
            wind: 0.6,
            strings: 0.7,
            horn: 0.6,
            moorhen: 0.5,
            oystercatcher: 0.4
        };
        
        // Himalayan pentatonic scales (frequencies in Hz)
        // Based on traditional Himalayan modal scales
        this.scales = {
            // C pentatonic minor - meditative
            meditation: [130.81, 155.56, 174.61, 196.00, 233.08, 261.63, 311.13, 349.23, 392.00, 466.16, 523.25],
            // D Phrygian-ish - singing bowl feel
            bowls: [146.83, 155.56, 174.61, 196.00, 220.00, 246.94, 293.66, 311.13, 349.23, 392.00, 440.00],
            // Drone base notes (relative ratios from fundamental)
            droneRatios: [1, 1.5, 2, 3]
        };
        
        // Base drone frequency (C2 = 65.41 Hz)
        this.droneBaseFrequency = 65.41;
        this.droneBaseSemitones = 0;
        
        // Map keyboard to scale degrees
        this.keyMap = {
            'a': 0, 'w': 1, 's': 2, 'e': 3, 'd': 4,
            'f': 5, 't': 6, 'g': 7, 'y': 8, 'h': 9,
            'j': 10, 'i': 11, 'k': 12, 'o': 13, 'l': 14
        };
        
        // Expression parameters
        this.expression = {
            filterCutoff: 2000,
            resonance: 1,
            reverbMix: 0.5,
            delayTime: 0.4,
            delayFeedback: 0.3,
            droneVolume: 0.3,
            bellVolume: 0.7,
            pitchBend: 0
        };
        
        // Touchpad tracking
        this.touchActive = false;
        this.lastTouchX = 0;
        this.lastTouchY = 0;
    }
    
    async init() {
        if (this.isInitialized) return;
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create master chain
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.7;
        
        // Create reverb
        this.reverbNode = await this.createReverb();
        
        // Create delay
        this.delayNode = this.createDelay();
        
        // Create master filter for expression
        this.masterFilter = this.audioContext.createBiquadFilter();
        this.masterFilter.type = 'lowpass';
        this.masterFilter.frequency.value = 4000;
        this.masterFilter.Q.value = 1;
        
        // Connect chain: voices -> filter -> delay -> reverb -> master -> output
        this.masterFilter.connect(this.delayNode.input);
        this.delayNode.output.connect(this.reverbNode.input);
        this.reverbNode.output.connect(this.masterGain);
        this.masterGain.connect(this.audioContext.destination);
        
        // Also connect dry signal
        this.masterFilter.connect(this.masterGain);
        
        this.isInitialized = true;
        console.log('🐦 Moorhen initialized');
    }
    
    async createReverb() {
        const convolver = this.audioContext.createConvolver();
        const wetGain = this.audioContext.createGain();
        const dryGain = this.audioContext.createGain();
        
        wetGain.gain.value = this.expression.reverbMix;
        dryGain.gain.value = 1 - this.expression.reverbMix;
        
        // Create impulse response for large reverberant space (like a temple)
        const duration = 4;
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * duration;
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                // Exponential decay with some randomness for natural sound
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
            }
        }
        
        convolver.buffer = impulse;
        
        return {
            input: convolver,
            output: wetGain,
            wetGain,
            convolver,
            setMix: (mix) => {
                wetGain.gain.value = mix;
            }
        };
    }
    
    createDelay() {
        const delay = this.audioContext.createDelay(2);
        const feedback = this.audioContext.createGain();
        const wetGain = this.audioContext.createGain();
        
        delay.delayTime.value = this.expression.delayTime;
        feedback.gain.value = this.expression.delayFeedback;
        wetGain.gain.value = 0.3;
        
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(wetGain);
        
        return {
            input: delay,
            output: wetGain,
            delay,
            feedback,
            setTime: (time) => { delay.delayTime.value = time; },
            setFeedback: (fb) => { feedback.gain.value = fb; }
        };
    }
    
    // Create a singing bowl voice with metallic harmonics
    createBowlVoice(frequency, velocity = 0.7) {
        const now = this.audioContext.currentTime;
        const voice = { oscillators: [], gains: [] };
        
        // Singing bowl has strong fundamental and specific harmonics
        const harmonics = [1, 2.0, 2.92, 3.0, 4.16, 5.43];
        const harmonicGains = [1, 0.6, 0.4, 0.25, 0.15, 0.08];
        
        harmonics.forEach((ratio, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            // Mix of sine and triangle for metallic quality
            osc.type = i === 0 ? 'sine' : (i % 2 === 0 ? 'triangle' : 'sine');
            osc.frequency.value = frequency * ratio * (1 + this.expression.pitchBend * 0.05);
            
            // Add slight detuning for richness
            osc.detune.value = (Math.random() - 0.5) * 5;
            
            gain.gain.value = 0;
            gain.gain.setValueAtTime(0, now);
            
            // Bell-like envelope: quick attack, slow decay
            const attackTime = 0.01 + i * 0.02;
            const decayTime = 2 + Math.random() * 2;
            const sustainLevel = harmonicGains[i] * velocity * this.expression.bellVolume * 0.3;
            
            gain.gain.linearRampToValueAtTime(sustainLevel, now + attackTime);
            gain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);
            
            osc.connect(gain);
            gain.connect(this.masterFilter);
            osc.start(now);
            osc.stop(now + decayTime + 0.1);
            
            voice.oscillators.push(osc);
            voice.gains.push(gain);
        });
        
        // Add a noise burst for the strike
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseData.length, 3);
        }
        
        const noiseSource = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        
        noiseSource.buffer = noiseBuffer;
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = frequency * 2;
        noiseFilter.Q.value = 2;
        noiseGain.gain.value = velocity * 0.15;
        
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterFilter);
        noiseSource.start(now);
        
        return voice;
    }
    
    // Create a drone voice (tanpura/shruti box style)
    createDroneVoice(frequency) {
        const now = this.audioContext.currentTime;
        const voice = { oscillators: [], gains: [], lfo: null };
        
        // Rich drone with multiple slightly detuned oscillators
        const detunings = [-5, -2, 0, 2, 5, 7];
        
        detunings.forEach((detune, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
            osc.frequency.value = frequency;
            osc.detune.value = detune;
            
            gain.gain.value = 0;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(this.expression.droneVolume / detunings.length, now + 3);
            
            osc.connect(gain);
            gain.connect(this.masterFilter);
            osc.start(now);
            
            voice.oscillators.push(osc);
            voice.gains.push(gain);
        });
        
        // Add LFO for subtle movement
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1 + Math.random() * 0.2;
        lfoGain.gain.value = 3;
        
        lfo.connect(lfoGain);
        voice.oscillators.forEach(osc => {
            lfoGain.connect(osc.detune);
        });
        lfo.start(now);
        voice.lfo = lfo;
        
        return voice;
    }
    
    // Play a note from keyboard
    playNote(keyCode) {
        if (!this.isInitialized) return;
        
        const scaleIndex = this.keyMap[keyCode.toLowerCase()];
        if (scaleIndex === undefined) return;
        if (this.activeVoices.has(keyCode)) return;
        
        const scale = this.scales.meditation;
        const frequency = scale[scaleIndex % scale.length] * Math.pow(2, Math.floor(scaleIndex / scale.length));
        
        const voice = this.createBowlVoice(frequency, 0.8);
        this.activeVoices.set(keyCode, voice);
        
        // Visual feedback
        this.onNotePlay?.(scaleIndex, frequency);
    }
    
    // Stop a note
    stopNote(keyCode) {
        const voice = this.activeVoices.get(keyCode);
        if (voice) {
            const now = this.audioContext.currentTime;
            voice.gains.forEach(gain => {
                gain.gain.cancelScheduledValues(now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            });
            this.activeVoices.delete(keyCode);
        }
    }
    
    // Start drone
    startDrone() {
        if (!this.isInitialized) return;
        if (this.droneVoices.length > 0) return;
        
        // Create layered drone using ratios from the base frequency
        this.scales.droneRatios.forEach((ratio, i) => {
            setTimeout(() => {
                const freq = this.droneBaseFrequency * ratio;
                const voice = this.createDroneVoice(freq);
                voice.ratio = ratio; // Store ratio for later pitch adjustments
                this.droneVoices.push(voice);
            }, i * 500);
        });
    }
    
    // Set drone base frequency (in semitones from C2)
    setDroneBase(semitones) {
        this.droneBaseSemitones = semitones;
        // Calculate frequency: C2 (65.41 Hz) shifted by semitones
        this.droneBaseFrequency = 65.41 * Math.pow(2, semitones / 12);
        
        // Update all active drone oscillators
        if (this.audioContext && this.droneVoices.length > 0) {
            const now = this.audioContext.currentTime;
            this.droneVoices.forEach(voice => {
                const targetFreq = this.droneBaseFrequency * voice.ratio;
                voice.oscillators.forEach(osc => {
                    // Smooth glide to new frequency
                    osc.frequency.cancelScheduledValues(now);
                    osc.frequency.setValueAtTime(osc.frequency.value, now);
                    osc.frequency.linearRampToValueAtTime(targetFreq, now + 0.3);
                });
            });
        }
        
        return this.getNoteName(semitones);
    }
    
    // Get note name from semitones offset
    getNoteName(semitones) {
        const notes = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
        // C2 is our base (index 0)
        const noteIndex = ((semitones % 12) + 12) % 12;
        const octave = 2 + Math.floor((semitones + 12) / 12) - 1;
        return `${notes[noteIndex]}${octave}`;
    }
    
    // Stop drone
    stopDrone() {
        const now = this.audioContext.currentTime;
        this.droneVoices.forEach(voice => {
            voice.gains.forEach(gain => {
                gain.gain.cancelScheduledValues(now);
                gain.gain.linearRampToValueAtTime(0, now + 2);
            });
            voice.oscillators.forEach(osc => {
                osc.stop(now + 2.1);
            });
            if (voice.lfo) voice.lfo.stop(now + 2.1);
        });
        this.droneVoices = [];
    }
    
    // Create wind sound (filtered noise with slow modulation)
    createWindSound() {
        if (this.windNode) return;
        
        // Create a long noise buffer
        const bufferSize = this.audioContext.sampleRate * 4;
        const noiseBuffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = noiseBuffer.getChannelData(channel);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1);
            }
        }
        
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;
        
        // Multiple filters for wind character
        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 800;
        lowpass.Q.value = 0.5;
        
        const highpass = this.audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 100;
        highpass.Q.value = 0.5;
        
        // LFO to modulate filter for gusting effect
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.15; // Very slow modulation
        lfoGain.gain.value = 400;
        lfo.connect(lfoGain);
        lfoGain.connect(lowpass.frequency);
        
        // Second LFO for stereo movement
        const lfo2 = this.audioContext.createOscillator();
        const lfo2Gain = this.audioContext.createGain();
        lfo2.type = 'sine';
        lfo2.frequency.value = 0.08;
        lfo2Gain.gain.value = 200;
        lfo2.connect(lfo2Gain);
        lfo2Gain.connect(lowpass.frequency);
        
        const gain = this.audioContext.createGain();
        gain.gain.value = 0;
        
        noiseSource.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(this.masterGain);
        
        noiseSource.start();
        lfo.start();
        lfo2.start();
        
        this.windNode = {
            source: noiseSource,
            gain: gain,
            lfo: lfo,
            lfo2: lfo2
        };
    }
    
    setWindVolume(volume) {
        this.windVolume = volume;
        if (!this.isInitialized) return;
        
        if (volume > 0 && !this.windNode) {
            this.createWindSound();
        }
        
        if (this.windNode) {
            const now = this.audioContext.currentTime;
            this.windNode.gain.gain.cancelScheduledValues(now);
            this.windNode.gain.gain.setValueAtTime(this.windNode.gain.gain.value, now);
            this.windNode.gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.5);
        }
    }
    
    // Create running water sound (layered filtered noise with different characteristics)
    createWaterSound() {
        if (this.waterNode) return;
        
        // Create noise buffer
        const bufferSize = this.audioContext.sampleRate * 3;
        const noiseBuffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = noiseBuffer.getChannelData(channel);
            for (let i = 0; i < bufferSize; i++) {
                // Pink-ish noise for water
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize * 0.3);
            }
        }
        
        // Main water stream
        const source1 = this.audioContext.createBufferSource();
        source1.buffer = noiseBuffer;
        source1.loop = true;
        
        const bp1 = this.audioContext.createBiquadFilter();
        bp1.type = 'bandpass';
        bp1.frequency.value = 2000;
        bp1.Q.value = 0.8;
        
        // Bubbling layer
        const source2 = this.audioContext.createBufferSource();
        source2.buffer = noiseBuffer;
        source2.loop = true;
        source2.playbackRate.value = 1.5;
        
        const bp2 = this.audioContext.createBiquadFilter();
        bp2.type = 'bandpass';
        bp2.frequency.value = 4000;
        bp2.Q.value = 2;
        
        // LFO for bubbling variation
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 3;
        lfoGain.gain.value = 1000;
        lfo.connect(lfoGain);
        lfoGain.connect(bp2.frequency);
        
        // Low rumble layer
        const source3 = this.audioContext.createBufferSource();
        source3.buffer = noiseBuffer;
        source3.loop = true;
        source3.playbackRate.value = 0.5;
        
        const lp = this.audioContext.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 400;
        lp.Q.value = 0.5;
        
        const gain = this.audioContext.createGain();
        gain.gain.value = 0;
        
        const gain2 = this.audioContext.createGain();
        gain2.gain.value = 0.3;
        
        const gain3 = this.audioContext.createGain();
        gain3.gain.value = 0.5;
        
        source1.connect(bp1);
        bp1.connect(gain);
        
        source2.connect(bp2);
        bp2.connect(gain2);
        gain2.connect(gain);
        
        source3.connect(lp);
        lp.connect(gain3);
        gain3.connect(gain);
        
        gain.connect(this.masterGain);
        
        source1.start();
        source2.start();
        source3.start();
        lfo.start();
        
        this.waterNode = {
            sources: [source1, source2, source3],
            gain: gain,
            lfo: lfo
        };
    }
    
    setWaterVolume(volume) {
        this.waterVolume = volume;
        if (!this.isInitialized) return;
        
        if (volume > 0 && !this.waterNode) {
            this.createWaterSound();
        }
        
        if (this.waterNode) {
            const now = this.audioContext.currentTime;
            this.waterNode.gain.gain.cancelScheduledValues(now);
            this.waterNode.gain.gain.setValueAtTime(this.waterNode.gain.gain.value, now);
            this.waterNode.gain.gain.linearRampToValueAtTime(volume * 0.25, now + 0.5);
        }
    }
    
    // Update expression from XY pad
    updateExpression(x, y) {
        // X controls filter cutoff (200 - 8000 Hz)
        this.expression.filterCutoff = 200 + x * 7800;
        this.masterFilter.frequency.value = this.expression.filterCutoff;
        
        // Y controls reverb/delay mix
        this.expression.reverbMix = y;
        this.reverbNode.setMix(y * 0.7);
        this.delayNode.setFeedback(0.2 + y * 0.4);
        
        this.onExpressionChange?.(x, y);
    }
    
    // Set master volume
    setVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.value = value;
        }
    }
    
    // Set drone volume
    setDroneVolume(value) {
        this.expression.droneVolume = value;
        const now = this.audioContext?.currentTime || 0;
        this.droneVoices.forEach(voice => {
            voice.gains.forEach(gain => {
                gain.gain.linearRampToValueAtTime(value / voice.gains.length, now + 0.1);
            });
        });
    }
    
    // Pitch bend
    setPitchBend(value) {
        this.expression.pitchBend = value;
        this.activeVoices.forEach(voice => {
            voice.oscillators.forEach((osc, i) => {
                const baseDetune = (Math.random() - 0.5) * 5;
                osc.detune.value = baseDetune + value * 100;
            });
        });
    }
    
    // Play a bowl strike at specific frequency
    strikeBowl(frequency, velocity = 0.8) {
        if (!this.isInitialized) return;
        return this.createBowlVoice(frequency, velocity);
    }
    
    // Create a wind/flute voice (bansuri-style)
    createWindVoice(frequency, velocity = 0.7, duration = 0.8) {
        const now = this.audioContext.currentTime;
        const voice = { oscillators: [], gains: [] };
        
        // Main tone - breathy sine with slight vibrato
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.value = frequency;
        
        // Add vibrato
        const vibrato = this.audioContext.createOscillator();
        const vibratoGain = this.audioContext.createGain();
        vibrato.type = 'sine';
        vibrato.frequency.value = 5 + Math.random() * 2; // 5-7 Hz vibrato
        vibratoGain.gain.value = frequency * 0.015; // Subtle pitch variation
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        vibrato.start(now);
        vibrato.stop(now + duration + 0.5);
        
        // Breathy noise layer
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.15;
        }
        const noiseSource = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        
        noiseSource.buffer = noiseBuffer;
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = frequency * 2;
        noiseFilter.Q.value = 1;
        noiseGain.gain.value = velocity * 0.1;
        
        // Envelope - soft attack, sustained, soft release
        gain.gain.value = 0;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(velocity * 0.4, now + 0.1);
        gain.gain.setValueAtTime(velocity * 0.4, now + duration - 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(velocity * 0.08, now + 0.05);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        // Low-pass filter for warmth
        filter.type = 'lowpass';
        filter.frequency.value = frequency * 4;
        filter.Q.value = 0.5;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterFilter);
        
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterFilter);
        
        osc.start(now);
        osc.stop(now + duration + 0.1);
        noiseSource.start(now);
        
        voice.oscillators.push(osc, vibrato);
        voice.gains.push(gain, noiseGain);
        
        return voice;
    }
    
    // Play wind instrument
    playWind(frequency, velocity = 0.7) {
        if (!this.isInitialized) return;
        return this.createWindVoice(frequency, velocity);
    }
    
    // Create a plucked string voice (sitar/tanpura pluck style)
    createStringVoice(frequency, velocity = 0.7) {
        const now = this.audioContext.currentTime;
        const voice = { oscillators: [], gains: [] };
        
        // Karplus-Strong-ish plucked string using multiple detuned oscillators
        // with sharp attack and long decay
        const harmonics = [1, 2, 3, 4, 5, 6];
        const harmonicGains = [1, 0.7, 0.5, 0.3, 0.2, 0.1];
        
        harmonics.forEach((ratio, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            // Mix of waveforms for sitar-like timbre
            osc.type = i === 0 ? 'sawtooth' : (i % 2 === 0 ? 'triangle' : 'square');
            osc.frequency.value = frequency * ratio;
            
            // Slight detuning for "buzzy" sitar quality
            osc.detune.value = (Math.random() - 0.5) * 8 + (i * 2);
            
            // Sharp attack, medium decay with harmonics decaying faster
            const attackTime = 0.005;
            const decayTime = 1.5 - (i * 0.15);
            const peakGain = harmonicGains[i] * velocity * 0.25;
            
            gain.gain.value = 0;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(peakGain, now + attackTime);
            gain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);
            
            osc.connect(gain);
            gain.connect(this.masterFilter);
            osc.start(now);
            osc.stop(now + decayTime + 0.1);
            
            voice.oscillators.push(osc);
            voice.gains.push(gain);
        });
        
        // Add sympathetic resonance (drone strings)
        const sympathetic = this.audioContext.createOscillator();
        const sympatheticGain = this.audioContext.createGain();
        const sympatheticFilter = this.audioContext.createBiquadFilter();
        
        sympathetic.type = 'sine';
        sympathetic.frequency.value = frequency / 2; // Octave below
        
        sympatheticFilter.type = 'bandpass';
        sympatheticFilter.frequency.value = frequency / 2;
        sympatheticFilter.Q.value = 10;
        
        sympatheticGain.gain.value = 0;
        sympatheticGain.gain.setValueAtTime(0, now + 0.1);
        sympatheticGain.gain.linearRampToValueAtTime(velocity * 0.05, now + 0.3);
        sympatheticGain.gain.exponentialRampToValueAtTime(0.001, now + 2);
        
        sympathetic.connect(sympatheticFilter);
        sympatheticFilter.connect(sympatheticGain);
        sympatheticGain.connect(this.masterFilter);
        sympathetic.start(now);
        sympathetic.stop(now + 2.1);
        
        voice.oscillators.push(sympathetic);
        voice.gains.push(sympatheticGain);
        
        return voice;
    }
    
    // Play string instrument
    playString(frequency, velocity = 0.7) {
        if (!this.isInitialized) return;
        return this.createStringVoice(frequency, velocity);
    }
    
    // Create a Tibetan long horn (dungchen) voice
    createHornVoice(frequency, velocity = 0.6, duration = 2.5) {
        const now = this.audioContext.currentTime;
        const voice = { oscillators: [], gains: [] };
        
        // The dungchen has a deep fundamental with rich brass overtones
        // Use lower frequencies - divide input by 2 for that deep resonance
        const baseFreq = frequency / 2;
        
        // Brass-like harmonic series with slight inharmonicity
        const harmonics = [1, 2, 2.98, 4.01, 5.03, 6.02, 7.01, 8.02];
        const harmonicGains = [1, 0.8, 0.5, 0.35, 0.25, 0.18, 0.12, 0.08];
        
        harmonics.forEach((ratio, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            // Mix of sawtooth and triangle for brassy quality
            osc.type = i < 3 ? 'sawtooth' : 'triangle';
            osc.frequency.value = baseFreq * ratio;
            
            // Slight random detuning for organic feel
            osc.detune.value = (Math.random() - 0.5) * 15;
            
            // Slow attack, sustained, gradual release - like breath control
            const attackTime = 0.3 + i * 0.05;
            const sustainLevel = harmonicGains[i] * velocity * 0.2;
            
            gain.gain.value = 0;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(sustainLevel, now + attackTime);
            // Slight swell in the middle
            gain.gain.linearRampToValueAtTime(sustainLevel * 1.2, now + duration * 0.5);
            gain.gain.linearRampToValueAtTime(sustainLevel * 0.8, now + duration * 0.8);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            osc.connect(gain);
            gain.connect(this.masterFilter);
            osc.start(now);
            osc.stop(now + duration + 0.1);
            
            voice.oscillators.push(osc);
            voice.gains.push(gain);
        });
        
        // Add pitch wobble/vibrato (breath variation)
        const vibrato = this.audioContext.createOscillator();
        const vibratoGain = this.audioContext.createGain();
        vibrato.type = 'sine';
        vibrato.frequency.value = 2 + Math.random(); // Slow vibrato 2-3 Hz
        vibratoGain.gain.value = baseFreq * 0.008; // Subtle pitch variation
        
        vibrato.connect(vibratoGain);
        voice.oscillators.forEach(osc => {
            vibratoGain.connect(osc.frequency);
        });
        vibrato.start(now + 0.5); // Vibrato comes in after attack
        vibrato.stop(now + duration);
        
        // Add breath noise layer
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.08;
        }
        
        const noiseSource = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        
        noiseSource.buffer = noiseBuffer;
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = baseFreq * 6;
        noiseFilter.Q.value = 0.5;
        
        noiseGain.gain.value = 0;
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(velocity * 0.04, now + 0.4);
        noiseGain.gain.linearRampToValueAtTime(velocity * 0.02, now + duration * 0.8);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterFilter);
        noiseSource.start(now);
        
        voice.oscillators.push(vibrato);
        voice.gains.push(noiseGain);
        
        return voice;
    }
    
    // Play horn instrument
    playHorn(frequency, velocity = 0.6) {
        if (!this.isInitialized) return;
        return this.createHornVoice(frequency, velocity);
    }
    
    // Create a moorhen call voice - chirpy, high-pitched with pitch modulation
    createMoorhenVoice(frequency, velocity = 0.5) {
        const now = this.audioContext.currentTime;
        const voice = { oscillators: [], gains: [] };
        
        // Bird calls are an octave higher
        const baseFreq = frequency * 2;
        
        // Number of chirps in this call (1-3)
        const numChirps = 1 + Math.floor(Math.random() * 3);
        const chirpDuration = 0.12;
        const chirpGap = 0.08;
        
        for (let chirp = 0; chirp < numChirps; chirp++) {
            const chirpStart = now + chirp * (chirpDuration + chirpGap);
            
            // Main tone oscillator
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            // Sine or triangle for pure bird-like tone
            osc.type = Math.random() > 0.5 ? 'sine' : 'triangle';
            osc.frequency.value = baseFreq;
            
            // Characteristic pitch sweep (birds often slide pitch)
            const pitchVariation = baseFreq * (0.1 + Math.random() * 0.2);
            const sweepUp = Math.random() > 0.5;
            
            osc.frequency.setValueAtTime(sweepUp ? baseFreq : baseFreq + pitchVariation, chirpStart);
            osc.frequency.exponentialRampToValueAtTime(
                sweepUp ? baseFreq + pitchVariation : baseFreq, 
                chirpStart + chirpDuration * 0.7
            );
            osc.frequency.exponentialRampToValueAtTime(
                baseFreq + pitchVariation * 0.5, 
                chirpStart + chirpDuration
            );
            
            // Add fast vibrato for warbling quality
            const vibrato = this.audioContext.createOscillator();
            const vibratoGain = this.audioContext.createGain();
            vibrato.type = 'sine';
            vibrato.frequency.value = 25 + Math.random() * 20; // Fast vibrato 25-45 Hz
            vibratoGain.gain.value = baseFreq * 0.03;
            vibrato.connect(vibratoGain);
            vibratoGain.connect(osc.frequency);
            vibrato.start(chirpStart);
            vibrato.stop(chirpStart + chirpDuration + 0.05);
            
            // Sharp attack, quick decay envelope
            gain.gain.value = 0;
            gain.gain.setValueAtTime(0, chirpStart);
            gain.gain.linearRampToValueAtTime(velocity * 0.4, chirpStart + 0.01);
            gain.gain.setValueAtTime(velocity * 0.35, chirpStart + chirpDuration * 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, chirpStart + chirpDuration);
            
            osc.connect(gain);
            gain.connect(this.masterFilter);
            
            osc.start(chirpStart);
            osc.stop(chirpStart + chirpDuration + 0.05);
            
            voice.oscillators.push(osc, vibrato);
            voice.gains.push(gain);
            
            // Add harmonic overtone for richness
            const overtone = this.audioContext.createOscillator();
            const overtoneGain = this.audioContext.createGain();
            overtone.type = 'sine';
            overtone.frequency.value = baseFreq * 2;
            
            overtoneGain.gain.value = 0;
            overtoneGain.gain.setValueAtTime(0, chirpStart);
            overtoneGain.gain.linearRampToValueAtTime(velocity * 0.15, chirpStart + 0.01);
            overtoneGain.gain.exponentialRampToValueAtTime(0.001, chirpStart + chirpDuration * 0.8);
            
            overtone.connect(overtoneGain);
            overtoneGain.connect(this.masterFilter);
            overtone.start(chirpStart);
            overtone.stop(chirpStart + chirpDuration + 0.05);
            
            voice.oscillators.push(overtone);
            voice.gains.push(overtoneGain);
        }
        
        return voice;
    }
    
    // Play moorhen call
    playMoorhen(frequency, velocity = 0.5) {
        if (!this.isInitialized) return;
        return this.createMoorhenVoice(frequency, velocity);
    }
    
    // Create an oystercatcher call voice - high-pitched piercing "neep neep" tone
    createOystercatcherVoice(frequency, velocity = 0.4) {
        const now = this.audioContext.currentTime;
        const voice = { oscillators: [], gains: [] };
        
        // Oystercatcher is very high pitched - 2 octaves up
        const baseFreq = frequency * 4;
        
        // Oystercatchers make sharp, piercing "peep peep" calls
        const numCalls = 2 + Math.floor(Math.random() * 2); // 2-3 calls
        const callDuration = 0.08;
        const callGap = 0.12;
        
        for (let call = 0; call < numCalls; call++) {
            const callStart = now + call * (callDuration + callGap);
            
            // Main piercing tone - pure sine for sharp quality
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            
            // Sharp upward pitch bend characteristic of oystercatcher
            osc.frequency.setValueAtTime(baseFreq * 0.9, callStart);
            osc.frequency.linearRampToValueAtTime(baseFreq * 1.15, callStart + callDuration * 0.3);
            osc.frequency.linearRampToValueAtTime(baseFreq * 1.1, callStart + callDuration);
            
            // Very sharp attack and decay
            gain.gain.value = 0;
            gain.gain.setValueAtTime(0, callStart);
            gain.gain.linearRampToValueAtTime(velocity * 0.5, callStart + 0.005);
            gain.gain.setValueAtTime(velocity * 0.45, callStart + callDuration * 0.5);
            gain.gain.exponentialRampToValueAtTime(0.001, callStart + callDuration);
            
            osc.connect(gain);
            gain.connect(this.masterFilter);
            
            osc.start(callStart);
            osc.stop(callStart + callDuration + 0.02);
            
            voice.oscillators.push(osc);
            voice.gains.push(gain);
            
            // Add harmonic for piercing quality
            const harmonic = this.audioContext.createOscillator();
            const harmonicGain = this.audioContext.createGain();
            
            harmonic.type = 'sine';
            harmonic.frequency.setValueAtTime(baseFreq * 1.8, callStart);
            harmonic.frequency.linearRampToValueAtTime(baseFreq * 2.3, callStart + callDuration * 0.3);
            
            harmonicGain.gain.value = 0;
            harmonicGain.gain.setValueAtTime(0, callStart);
            harmonicGain.gain.linearRampToValueAtTime(velocity * 0.2, callStart + 0.005);
            harmonicGain.gain.exponentialRampToValueAtTime(0.001, callStart + callDuration * 0.7);
            
            harmonic.connect(harmonicGain);
            harmonicGain.connect(this.masterFilter);
            
            harmonic.start(callStart);
            harmonic.stop(callStart + callDuration + 0.02);
            
            voice.oscillators.push(harmonic);
            voice.gains.push(harmonicGain);
        }
        
        return voice;
    }
    
    // Play oystercatcher call
    playOystercatcher(frequency, velocity = 0.4) {
        if (!this.isInitialized) return;
        return this.createOystercatcherVoice(frequency, velocity);
    }
    
    // Get frequency for a note index in the meditation scale
    getNoteFrequency(noteIndex) {
        const scale = this.scales.meditation;
        return scale[noteIndex % scale.length] * Math.pow(2, Math.floor(noteIndex / scale.length));
    }
    
    // ============ SEQUENCER METHODS ============
    
    startSequencer() {
        if (this.sequencer.isPlaying) return;
        this.sequencer.isPlaying = true;
        this.sequencer.currentStep = 0;
        
        const stepDuration = (60 / this.sequencer.bpm) * 1000 / 2; // 8th notes
        
        this.sequencer.intervalId = setInterval(() => {
            this.advanceSequencerStep();
            this.playSequencerStep();
            this.onSequencerStep?.(this.sequencer.currentStep);
        }, stepDuration);
        
        // Play first step immediately
        this.playSequencerStep();
        this.onSequencerStep?.(this.sequencer.currentStep);
    }
    
    advanceSequencerStep() {
        const randomness = this.sequencer.randomness;
        
        if (randomness === 0) {
            // Fully sequential
            this.sequencer.currentStep = (this.sequencer.currentStep + 1) % 16;
        } else if (randomness >= 1) {
            // Fully random
            this.sequencer.currentStep = Math.floor(Math.random() * 16);
        } else {
            // Partial randomness: sometimes jump, sometimes sequential
            if (Math.random() < randomness) {
                // Random jump - weighted towards nearby steps at lower randomness
                const jumpRange = Math.ceil(randomness * 15);
                const jump = Math.floor(Math.random() * (jumpRange * 2 + 1)) - jumpRange;
                this.sequencer.currentStep = ((this.sequencer.currentStep + jump) % 16 + 16) % 16;
            } else {
                // Sequential
                this.sequencer.currentStep = (this.sequencer.currentStep + 1) % 16;
            }
        }
    }
    
    setSequencerRandomness(value) {
        this.sequencer.randomness = Math.max(0, Math.min(1, value));
    }
    
    stopSequencer() {
        if (!this.sequencer.isPlaying) return;
        this.sequencer.isPlaying = false;
        if (this.sequencer.intervalId) {
            clearInterval(this.sequencer.intervalId);
            this.sequencer.intervalId = null;
        }
        this.sequencer.currentStep = 0;
        this.onSequencerStep?.(-1); // Signal stopped
    }
    
    playSequencerStep() {
        const step = this.sequencer.currentStep;
        
        // Play bowls
        const bowlStep = this.sequencer.bowls[step];
        if (bowlStep.active) {
            const freq = this.getNoteFrequency(bowlStep.noteIndex);
            this.strikeBowl(freq, this.instrumentVolumes.bowls);
        }
        
        // Play wind
        const windStep = this.sequencer.wind[step];
        if (windStep.active) {
            const freq = this.getNoteFrequency(windStep.noteIndex);
            this.playWind(freq, this.instrumentVolumes.wind);
        }
        
        // Play strings
        const stringStep = this.sequencer.strings[step];
        if (stringStep.active) {
            const freq = this.getNoteFrequency(stringStep.noteIndex);
            this.playString(freq, this.instrumentVolumes.strings);
        }
        
        // Play horn
        const hornStep = this.sequencer.horn[step];
        if (hornStep.active) {
            const freq = this.getNoteFrequency(hornStep.noteIndex);
            this.playHorn(freq, this.instrumentVolumes.horn);
        }
        
        // Play moorhen
        const moorhenStep = this.sequencer.moorhen[step];
        if (moorhenStep.active) {
            const freq = this.getNoteFrequency(moorhenStep.noteIndex);
            this.playMoorhen(freq, this.instrumentVolumes.moorhen);
        }
        
        // Play oystercatcher
        const oystercatcherStep = this.sequencer.oystercatcher[step];
        if (oystercatcherStep.active) {
            const freq = this.getNoteFrequency(oystercatcherStep.noteIndex);
            this.playOystercatcher(freq, this.instrumentVolumes.oystercatcher);
        }
    }
    
    setInstrumentVolume(instrument, volume) {
        if (this.instrumentVolumes.hasOwnProperty(instrument)) {
            this.instrumentVolumes[instrument] = Math.max(0, Math.min(1, volume));
        }
    }
    
    setSequencerBPM(bpm) {
        this.sequencer.bpm = bpm;
        // If playing, restart with new tempo
        if (this.sequencer.isPlaying) {
            this.stopSequencer();
            this.startSequencer();
        }
    }
    
    setSequencerStep(instrument, stepIndex, noteIndex, active) {
        if (this.sequencer[instrument] && this.sequencer[instrument][stepIndex]) {
            if (noteIndex !== undefined) {
                this.sequencer[instrument][stepIndex].noteIndex = noteIndex;
            }
            if (active !== undefined) {
                this.sequencer[instrument][stepIndex].active = active;
            }
        }
    }
    
    toggleSequencerStep(instrument, stepIndex) {
        if (this.sequencer[instrument] && this.sequencer[instrument][stepIndex]) {
            this.sequencer[instrument][stepIndex].active = !this.sequencer[instrument][stepIndex].active;
            return this.sequencer[instrument][stepIndex].active;
        }
        return false;
    }
}

// Initialize and export
const synth = new HimalayanSynth();

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.target.tagName === 'INPUT') return;
    
    if (e.key === ' ') {
        e.preventDefault();
        if (synth.droneVoices.length === 0) {
            synth.startDrone();
            document.getElementById('drone-btn')?.classList.add('active');
        } else {
            synth.stopDrone();
            document.getElementById('drone-btn')?.classList.remove('active');
        }
        return;
    }
    
    synth.playNote(e.key);
});

document.addEventListener('keyup', (e) => {
    synth.stopNote(e.key);
});

// Export for use in HTML
window.HimalayanSynth = synth;

