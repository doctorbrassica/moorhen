// Moorhen Synthesizer - Audio Engine
// ===================================

class MoorhenSynth {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.filterNode = null;
        this.reverbNode = null;
        this.reverbGain = null;
        this.dryGain = null;
        this.pitchBend = 0;
        
        // Instrument volumes
        this.instrumentVolumes = {
            bowls: 0.7,
            wind: 0.6,
            strings: 0.7,
            horn: 0.6,
            moorhen: 0.5,
            oystercatcher: 0.4,
            stick: 0.6
        };
        
        // Drone state
        this.droneActive = false;
        this.droneOscillators = [];
        this.droneGain = null;
        this.droneBaseNote = 0;
        this.droneTargetVolume = 0.3;
        
        // Ambient sounds
        this.windNode = null;
        this.waterNode = null;
        
        // Pentatonic scale intervals (C minor pentatonic)
        this.scaleIntervals = [0, 3, 5, 7, 10, 12, 15]; // C, D#, F, G, A#, C, D#
        this.baseFreq = 261.63; // C4
    }
    
    async init() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create master gain
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.7;
        
        // Create filter for expression pad
        this.filterNode = this.audioContext.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.value = 2000;
        this.filterNode.Q.value = 1;
        
        // Create reverb
        await this.createReverb();
        
        // Create dry/wet mix
        this.dryGain = this.audioContext.createGain();
        this.dryGain.gain.value = 0.5;
        
        this.reverbGain = this.audioContext.createGain();
        this.reverbGain.gain.value = 0.5;
        
        // Connect: filter -> dry/wet mix -> master -> output
        this.filterNode.connect(this.dryGain);
        this.filterNode.connect(this.reverbNode);
        this.reverbNode.connect(this.reverbGain);
        this.dryGain.connect(this.masterGain);
        this.reverbGain.connect(this.masterGain);
        this.masterGain.connect(this.audioContext.destination);
        
        // Create drone gain
        this.droneGain = this.audioContext.createGain();
        this.droneGain.gain.value = 0;
        this.droneGain.connect(this.filterNode);
        
        return this;
    }
    
    async createReverb() {
        // Create impulse response for reverb
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * 2.5; // 2.5 second reverb
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                // Exponential decay with some randomness for natural sound
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
            }
        }
        
        this.reverbNode = this.audioContext.createConvolver();
        this.reverbNode.buffer = impulse;
    }
    
    getFrequency(noteIndex) {
        const semitones = this.scaleIntervals[noteIndex] || 0;
        return this.baseFreq * Math.pow(2, (semitones + this.pitchBend) / 12);
    }
    
    setMasterVolume(value) {
        this.masterGain.gain.setTargetAtTime(value, this.audioContext.currentTime, 0.01);
    }
    
    setFilter(frequency) {
        this.filterNode.frequency.setTargetAtTime(frequency, this.audioContext.currentTime, 0.05);
    }
    
    setReverb(amount) {
        this.dryGain.gain.setTargetAtTime(1 - amount * 0.7, this.audioContext.currentTime, 0.05);
        this.reverbGain.gain.setTargetAtTime(amount, this.audioContext.currentTime, 0.05);
    }
    
    setPitchBend(semitones) {
        this.pitchBend = semitones;
        // Update drone if active
        if (this.droneActive) {
            this.updateDronePitch();
        }
    }
    
    setInstrumentVolume(instrument, value) {
        this.instrumentVolumes[instrument] = value;
    }
    
    // ==================
    // INSTRUMENT SOUNDS
    // ==================
    
    playBowl(noteIndex) {
        const freq = this.getFrequency(noteIndex);
        const now = this.audioContext.currentTime;
        const volume = this.instrumentVolumes.bowls;
        
        // Main tone
        const osc1 = this.audioContext.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = freq;
        
        // Harmonic overtones
        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 2.01; // Slight detuning for richness
        
        const osc3 = this.audioContext.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.value = freq * 3.02;
        
        // Gain envelopes
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        const gain3 = this.audioContext.createGain();
        
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(volume * 0.4, now + 0.01);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 4);
        
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(volume * 0.2, now + 0.01);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 3);
        
        gain3.gain.setValueAtTime(0, now);
        gain3.gain.linearRampToValueAtTime(volume * 0.1, now + 0.01);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 2);
        
        // Connect
        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);
        gain1.connect(this.filterNode);
        gain2.connect(this.filterNode);
        gain3.connect(this.filterNode);
        
        // Play
        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        osc1.stop(now + 4);
        osc2.stop(now + 3);
        osc3.stop(now + 2);
    }
    
    playWind(noteIndex) {
        const freq = this.getFrequency(noteIndex);
        const now = this.audioContext.currentTime;
        const volume = this.instrumentVolumes.wind;
        
        // Main breathy tone
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        // Add breathiness with filtered noise
        const noise = this.createNoise(1.5);
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = freq;
        noiseFilter.Q.value = 5;
        
        // Vibrato
        const vibrato = this.audioContext.createOscillator();
        vibrato.frequency.value = 5;
        const vibratoGain = this.audioContext.createGain();
        vibratoGain.gain.value = 3;
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        
        // Envelopes
        const oscGain = this.audioContext.createGain();
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.1);
        oscGain.gain.setValueAtTime(volume * 0.3, now + 0.8);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(volume * 0.08, now + 0.05);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        
        // Connect
        osc.connect(oscGain);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        oscGain.connect(this.filterNode);
        noiseGain.connect(this.filterNode);
        
        // Play
        vibrato.start(now);
        osc.start(now);
        vibrato.stop(now + 1.5);
        osc.stop(now + 1.5);
    }
    
    playString(noteIndex) {
        const freq = this.getFrequency(noteIndex);
        const now = this.audioContext.currentTime;
        const volume = this.instrumentVolumes.strings;
        
        // Karplus-Strong-like string synthesis
        const baseOsc = this.audioContext.createOscillator();
        baseOsc.type = 'sawtooth';
        baseOsc.frequency.value = freq;
        
        // Second harmonic
        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = freq * 2;
        
        // Pluck filter
        const pluckFilter = this.audioContext.createBiquadFilter();
        pluckFilter.type = 'lowpass';
        pluckFilter.frequency.setValueAtTime(freq * 8, now);
        pluckFilter.frequency.exponentialRampToValueAtTime(freq * 2, now + 0.3);
        
        // Gain envelopes
        const gain1 = this.audioContext.createGain();
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(volume * 0.35, now + 0.005);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 2);
        
        const gain2 = this.audioContext.createGain();
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(volume * 0.15, now + 0.005);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        
        // Connect
        baseOsc.connect(pluckFilter);
        osc2.connect(pluckFilter);
        pluckFilter.connect(gain1);
        pluckFilter.connect(gain2);
        gain1.connect(this.filterNode);
        gain2.connect(this.filterNode);
        
        // Play
        baseOsc.start(now);
        osc2.start(now);
        baseOsc.stop(now + 2);
        osc2.stop(now + 1.5);
    }
    
    playHorn(noteIndex) {
        const freq = this.getFrequency(noteIndex) / 2; // One octave lower
        const now = this.audioContext.currentTime;
        const volume = this.instrumentVolumes.horn;
        
        // Rich brass-like harmonics
        const harmonics = [1, 2, 3, 4, 5, 6];
        const harmonicGains = [1, 0.7, 0.5, 0.3, 0.2, 0.1];
        
        harmonics.forEach((h, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = i === 0 ? 'sawtooth' : 'sine';
            osc.frequency.value = freq * h;
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(volume * harmonicGains[i] * 0.15, now + 0.08);
            gain.gain.setValueAtTime(volume * harmonicGains[i] * 0.15, now + 0.6);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            
            osc.connect(gain);
            gain.connect(this.filterNode);
            
            osc.start(now);
            osc.stop(now + 1.2);
        });
    }
    
    playMoorhen(noteIndex) {
        const freq = this.getFrequency(noteIndex) * 2; // Higher pitched bird call
        const now = this.audioContext.currentTime;
        const volume = this.instrumentVolumes.moorhen;
        
        // Moorhen call - characteristic "kurruk" sound
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        
        // Pitch sweep for bird call effect
        osc.frequency.setValueAtTime(freq * 1.3, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.8, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(freq, now + 0.25);
        
        // Add some modulation for natural sound
        const modOsc = this.audioContext.createOscillator();
        modOsc.frequency.value = 30;
        const modGain = this.audioContext.createGain();
        modGain.gain.value = 15;
        modOsc.connect(modGain);
        modGain.connect(osc.frequency);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.02);
        gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        osc.connect(gain);
        gain.connect(this.filterNode);
        
        modOsc.start(now);
        osc.start(now);
        modOsc.stop(now + 0.4);
        osc.stop(now + 0.4);
    }
    
    playOystercatcher(noteIndex) {
        const freq = this.getFrequency(noteIndex) * 3; // Very high pitched call
        const now = this.audioContext.currentTime;
        const volume = this.instrumentVolumes.oystercatcher;
        
        // Oystercatcher - sharp "kleep kleep" call
        for (let i = 0; i < 2; i++) {
            const offset = i * 0.12;
            
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq * 1.2, now + offset);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.9, now + offset + 0.08);
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0, now + offset);
            gain.gain.linearRampToValueAtTime(volume * 0.35, now + offset + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);
            
            osc.connect(gain);
            gain.connect(this.filterNode);
            
            osc.start(now + offset);
            osc.stop(now + offset + 0.12);
        }
    }
    
    playStick(noteIndex) {
        // Wooden stick breaking sound - synthesized percussion
        const now = this.audioContext.currentTime;
        const volume = this.instrumentVolumes.stick;
        
        // Base pitch varies with note index for different "sizes" of sticks
        const basePitch = 200 + (noteIndex * 80); // Range from 200Hz to 680Hz
        
        // 1. Initial crack - filtered noise burst
        const crackNoise = this.createNoise(0.15);
        const crackFilter = this.audioContext.createBiquadFilter();
        crackFilter.type = 'bandpass';
        crackFilter.frequency.value = basePitch * 4;
        crackFilter.Q.value = 2;
        
        const crackGain = this.audioContext.createGain();
        crackGain.gain.setValueAtTime(0, now);
        crackGain.gain.linearRampToValueAtTime(volume * 0.8, now + 0.001);
        crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        crackNoise.connect(crackFilter);
        crackFilter.connect(crackGain);
        crackGain.connect(this.filterNode);
        
        // 2. Woody resonance - short pitched tone with quick decay
        const woodOsc1 = this.audioContext.createOscillator();
        woodOsc1.type = 'triangle';
        woodOsc1.frequency.setValueAtTime(basePitch, now);
        woodOsc1.frequency.exponentialRampToValueAtTime(basePitch * 0.7, now + 0.1);
        
        const woodOsc2 = this.audioContext.createOscillator();
        woodOsc2.type = 'sine';
        woodOsc2.frequency.setValueAtTime(basePitch * 1.5, now);
        woodOsc2.frequency.exponentialRampToValueAtTime(basePitch * 0.9, now + 0.08);
        
        const woodGain1 = this.audioContext.createGain();
        woodGain1.gain.setValueAtTime(0, now);
        woodGain1.gain.linearRampToValueAtTime(volume * 0.35, now + 0.002);
        woodGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        const woodGain2 = this.audioContext.createGain();
        woodGain2.gain.setValueAtTime(0, now);
        woodGain2.gain.linearRampToValueAtTime(volume * 0.2, now + 0.002);
        woodGain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        woodOsc1.connect(woodGain1);
        woodOsc2.connect(woodGain2);
        woodGain1.connect(this.filterNode);
        woodGain2.connect(this.filterNode);
        
        // 3. Secondary crackle - smaller noise bursts
        const crackle1 = this.createNoise(0.08);
        const crackleFilter1 = this.audioContext.createBiquadFilter();
        crackleFilter1.type = 'highpass';
        crackleFilter1.frequency.value = basePitch * 6;
        
        const crackleGain1 = this.audioContext.createGain();
        crackleGain1.gain.setValueAtTime(0, now + 0.02);
        crackleGain1.gain.linearRampToValueAtTime(volume * 0.25, now + 0.022);
        crackleGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        
        crackle1.connect(crackleFilter1);
        crackleFilter1.connect(crackleGain1);
        crackleGain1.connect(this.filterNode);
        
        // 4. Fiber tearing sound - modulated noise
        const fiberNoise = this.createNoise(0.12);
        const fiberFilter = this.audioContext.createBiquadFilter();
        fiberFilter.type = 'bandpass';
        fiberFilter.frequency.value = basePitch * 2;
        fiberFilter.Q.value = 1;
        
        const fiberGain = this.audioContext.createGain();
        fiberGain.gain.setValueAtTime(0, now + 0.005);
        fiberGain.gain.linearRampToValueAtTime(volume * 0.15, now + 0.01);
        fiberGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        
        fiberNoise.connect(fiberFilter);
        fiberFilter.connect(fiberGain);
        fiberGain.connect(this.filterNode);
        
        // Start oscillators
        woodOsc1.start(now);
        woodOsc2.start(now);
        woodOsc1.stop(now + 0.2);
        woodOsc2.stop(now + 0.15);
    }
    
    // Helper to create noise source
    createNoise(duration) {
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        noise.start(this.audioContext.currentTime);
        
        return noise;
    }
    
    // Play any instrument by name
    playInstrument(instrument, noteIndex) {
        switch(instrument) {
            case 'bowls':
                this.playBowl(noteIndex);
                break;
            case 'wind':
                this.playWind(noteIndex);
                break;
            case 'strings':
                this.playString(noteIndex);
                break;
            case 'horn':
                this.playHorn(noteIndex);
                break;
            case 'moorhen':
                this.playMoorhen(noteIndex);
                break;
            case 'oystercatcher':
                this.playOystercatcher(noteIndex);
                break;
            case 'stick':
                this.playStick(noteIndex);
                break;
        }
    }
    
    // ==================
    // DRONE
    // ==================
    
    startDrone(baseNote = 0, volume = 0.3) {
        if (this.droneActive) return;
        this.droneActive = true;
        this.droneBaseNote = baseNote;
        this.droneTargetVolume = volume;
        
        const baseFreq = 65.41 * Math.pow(2, baseNote / 12); // C2 base
        const now = this.audioContext.currentTime;
        
        // Multiple oscillators for rich drone
        const frequencies = [
            baseFreq,           // Root
            baseFreq * 2,       // Octave
            baseFreq * 3,       // Fifth
            baseFreq * 1.5,     // Perfect fifth
        ];
        
        const gains = [0.4, 0.2, 0.1, 0.15];
        
        frequencies.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = i === 0 ? 'sawtooth' : 'sine';
            osc.frequency.value = freq + (Math.random() - 0.5) * 0.5; // Slight detune
            
            const oscGain = this.audioContext.createGain();
            oscGain.gain.value = gains[i];
            
            osc.connect(oscGain);
            oscGain.connect(this.droneGain);
            osc.start();
            
            this.droneOscillators.push({ osc, gain: oscGain });
        });
        
        // Fade in
        this.droneGain.gain.setTargetAtTime(volume, now, 0.5);
    }
    
    stopDrone() {
        if (!this.droneActive) return;
        this.droneActive = false;
        
        const now = this.audioContext.currentTime;
        this.droneGain.gain.setTargetAtTime(0, now, 0.5);
        
        // Keep reference to oscillators to stop
        const oscillatorsToStop = [...this.droneOscillators];
        this.droneOscillators = [];
        
        // Stop oscillators after fade
        setTimeout(() => {
            oscillatorsToStop.forEach(({ osc }) => {
                try { osc.stop(); } catch(e) {}
            });
        }, 2000);
    }
    
    toggleDrone(baseNote, volume) {
        if (this.droneActive) {
            this.stopDrone();
        } else {
            this.startDrone(baseNote, volume);
        }
        return this.droneActive;
    }
    
    setDroneVolume(volume) {
        this.droneTargetVolume = volume;
        if (this.droneActive) {
            this.droneGain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1);
        }
    }
    
    setDroneBase(semitones) {
        this.droneBaseNote = semitones;
        if (this.droneActive) {
            // Update frequencies in real-time instead of stopping/restarting
            this.updateDroneFrequencies();
        }
    }
    
    updateDroneFrequencies() {
        const baseFreq = 65.41 * Math.pow(2, (this.droneBaseNote + this.pitchBend) / 12);
        const frequencies = [baseFreq, baseFreq * 2, baseFreq * 3, baseFreq * 1.5];
        
        this.droneOscillators.forEach(({ osc }, i) => {
            if (frequencies[i]) {
                osc.frequency.setTargetAtTime(frequencies[i], this.audioContext.currentTime, 0.1);
            }
        });
    }
    
    updateDronePitch() {
        // Called when pitch bend changes - reuse the same frequency update logic
        this.updateDroneFrequencies();
    }
    
    // ==================
    // AMBIENT SOUNDS
    // ==================
    
    startWind(volume) {
        if (this.windNode) return;
        
        // Create continuous wind noise
        const bufferSize = this.audioContext.sampleRate * 4;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            let lastOut = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                // Brown noise approximation
                data[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = data[i];
                data[i] *= 3.5;
            }
        }
        
        this.windNode = this.audioContext.createBufferSource();
        this.windNode.buffer = buffer;
        this.windNode.loop = true;
        
        const windFilter = this.audioContext.createBiquadFilter();
        windFilter.type = 'lowpass';
        windFilter.frequency.value = 800;
        
        const windGain = this.audioContext.createGain();
        windGain.gain.value = volume;
        
        this.windNode.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(this.masterGain);
        
        this.windNode.start();
        this.windGainNode = windGain;
    }
    
    setWindVolume(volume) {
        if (volume > 0 && !this.windNode) {
            this.startWind(volume);
        } else if (this.windGainNode) {
            this.windGainNode.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1);
        }
    }
    
    startWater(volume) {
        if (this.waterNode) return;
        
        // Create water drip/splash sounds
        const bufferSize = this.audioContext.sampleRate * 3;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < bufferSize; i++) {
                // Pink noise for water
                data[i] = (Math.random() * 2 - 1) * 0.5;
                // Add occasional "drips"
                if (Math.random() < 0.0001) {
                    const dripLength = Math.random() * 500 + 100;
                    for (let j = 0; j < dripLength && i + j < bufferSize; j++) {
                        data[i + j] += Math.sin(j * 0.1) * Math.exp(-j / 100) * 0.3;
                    }
                }
            }
        }
        
        this.waterNode = this.audioContext.createBufferSource();
        this.waterNode.buffer = buffer;
        this.waterNode.loop = true;
        
        const waterFilter = this.audioContext.createBiquadFilter();
        waterFilter.type = 'bandpass';
        waterFilter.frequency.value = 1500;
        waterFilter.Q.value = 0.5;
        
        const waterGain = this.audioContext.createGain();
        waterGain.gain.value = volume;
        
        this.waterNode.connect(waterFilter);
        waterFilter.connect(waterGain);
        waterGain.connect(this.masterGain);
        
        this.waterNode.start();
        this.waterGainNode = waterGain;
    }
    
    setWaterVolume(volume) {
        if (volume > 0 && !this.waterNode) {
            this.startWater(volume);
        } else if (this.waterGainNode) {
            this.waterGainNode.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1);
        }
    }
}

// Export globally
window.MoorhenSynth = MoorhenSynth;
