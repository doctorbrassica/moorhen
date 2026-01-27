// Moorhen Synthesizer - UI Controller
// ====================================

let synth = null;

// MIDI state
const midi = {
    access: null,
    inputs: [],
    activeInput: null,
    activeInstrument: 'bowls',
    enabled: false,
    // Map MIDI channels (0-6) to instruments
    channelMap: ['bowls', 'wind', 'strings', 'horn', 'moorhen', 'oystercatcher', 'stick'],
    // CC mappings
    ccMap: {
        1: 'filter',      // Mod wheel -> filter
        7: 'volume',      // Volume
        74: 'filter',     // Filter cutoff
        91: 'reverb',     // Reverb
    }
};

// Sequencer state
const sequencer = {
    playing: false,
    currentStep: 0,
    tempo: 120,
    randomness: 0,
    intervalId: null,
    patterns: {
        bowls: Array(16).fill(null),
        wind: Array(16).fill(null),
        strings: Array(16).fill(null),
        horn: Array(16).fill(null),
        moorhen: Array(16).fill(null),
        oystercatcher: Array(16).fill(null),
        stick: Array(16).fill(null)
    }
};

// Note names for dropdown
const noteNames = ['C', 'D#', 'F', 'G', 'A#', 'C+', 'D#+'];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupStartOverlay();
    setupNoteSelects();
    setupAboutModal();
});

function setupAboutModal() {
    const logo = document.getElementById('header-logo');
    const modal = document.getElementById('about-modal');
    const closeBtn = document.getElementById('modal-close');
    const backdrop = modal.querySelector('.modal-backdrop');
    
    function openModal() {
        modal.classList.remove('hidden');
    }
    
    function closeModal() {
        modal.classList.add('hidden');
    }
    
    logo.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

function setupStartOverlay() {
    const overlay = document.getElementById('start-overlay');
    const startBtn = document.getElementById('start-btn');
    const mainInterface = document.getElementById('main-interface');
    
    startBtn.addEventListener('click', async () => {
        // Initialize audio context
        synth = new MoorhenSynth();
        await synth.init();
        
        // Hide overlay, show main interface
        overlay.classList.add('hidden');
        mainInterface.classList.remove('hidden');
        
        // Setup all controls
        setupInstrumentControls();
        setupXYPad();
        setupDroneControls();
        setupSequencer();
        setupPitchWheel();
        setupKeyboard();
        setupVolumeControls();
        setupVisualization();
        setupMIDI();
    });
}

function setupNoteSelects() {
    // Populate all note select dropdowns
    document.querySelectorAll('.note-select').forEach(select => {
        select.innerHTML = '<option value="">—</option>';
        noteNames.forEach((name, i) => {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = name;
            select.appendChild(option);
        });
    });
}

function setupInstrumentControls() {
    // Bowl notes
    document.querySelectorAll('.bowl').forEach(el => {
        el.addEventListener('click', () => {
            const note = parseInt(el.dataset.note);
            synth.playBowl(note);
            flashElement(el);
        });
    });
    
    // Wind notes
    document.querySelectorAll('.wind-note').forEach(el => {
        el.addEventListener('click', () => {
            const note = parseInt(el.dataset.note);
            synth.playWind(note);
            flashElement(el);
        });
    });
    
    // String notes
    document.querySelectorAll('.string-note').forEach(el => {
        el.addEventListener('click', () => {
            const note = parseInt(el.dataset.note);
            synth.playString(note);
            flashElement(el);
        });
    });
    
    // Horn notes
    document.querySelectorAll('.horn-note').forEach(el => {
        el.addEventListener('click', () => {
            const note = parseInt(el.dataset.note);
            synth.playHorn(note);
            flashElement(el);
        });
    });
    
    // Moorhen notes
    document.querySelectorAll('.moorhen-note').forEach(el => {
        el.addEventListener('click', () => {
            const note = parseInt(el.dataset.note);
            synth.playMoorhen(note);
            flashElement(el);
        });
    });
    
    // Oystercatcher notes
    document.querySelectorAll('.oystercatcher-note').forEach(el => {
        el.addEventListener('click', () => {
            const note = parseInt(el.dataset.note);
            synth.playOystercatcher(note);
            flashElement(el);
        });
    });
    
    // Stick notes
    document.querySelectorAll('.stick-note').forEach(el => {
        el.addEventListener('click', () => {
            const note = parseInt(el.dataset.note);
            synth.playStick(note);
            flashElement(el);
        });
    });
}

function flashElement(el) {
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 200);
}

function setupXYPad() {
    const pad = document.getElementById('xy-pad');
    const cursor = document.getElementById('xy-cursor');
    const filterValue = document.getElementById('filter-value');
    const reverbValue = document.getElementById('reverb-value');
    
    let isDragging = false;
    
    function updateFromPosition(x, y) {
        const rect = pad.getBoundingClientRect();
        const relX = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
        const relY = Math.max(0, Math.min(1, (y - rect.top) / rect.height));
        
        // Update cursor position
        cursor.style.left = `${relX * 100}%`;
        cursor.style.top = `${relY * 100}%`;
        
        // X controls filter (200Hz - 8000Hz)
        const filterFreq = 200 * Math.pow(40, relX);
        synth.setFilter(filterFreq);
        filterValue.textContent = `Filter: ${Math.round(filterFreq)} Hz`;
        
        // Y controls reverb (inverted - top is more reverb)
        const reverbAmount = 1 - relY;
        synth.setReverb(reverbAmount);
        reverbValue.textContent = `Space: ${Math.round(reverbAmount * 100)}%`;
    }
    
    pad.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateFromPosition(e.clientX, e.clientY);
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            updateFromPosition(e.clientX, e.clientY);
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    // Touch support
    pad.addEventListener('touchstart', (e) => {
        isDragging = true;
        const touch = e.touches[0];
        updateFromPosition(touch.clientX, touch.clientY);
        e.preventDefault();
    });
    
    pad.addEventListener('touchmove', (e) => {
        if (isDragging) {
            const touch = e.touches[0];
            updateFromPosition(touch.clientX, touch.clientY);
            e.preventDefault();
        }
    });
    
    pad.addEventListener('touchend', () => {
        isDragging = false;
    });
}

function setupDroneControls() {
    const droneBtn = document.getElementById('drone-btn');
    const droneBase = document.getElementById('drone-base');
    const droneVolume = document.getElementById('drone-volume');
    const droneBaseValue = document.getElementById('drone-base-value');
    const windVolume = document.getElementById('wind-volume');
    const windValue = document.getElementById('wind-value');
    const waterVolume = document.getElementById('water-volume');
    const waterValue = document.getElementById('water-value');
    
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    droneBtn.addEventListener('click', () => {
        const base = parseInt(droneBase.value);
        const vol = parseFloat(droneVolume.value);
        const isActive = synth.toggleDrone(base, vol);
        droneBtn.classList.toggle('active', isActive);
    });
    
    droneBase.addEventListener('input', () => {
        const semitones = parseInt(droneBase.value);
        const noteIndex = ((semitones % 12) + 12) % 12;
        const octave = Math.floor((semitones + 24) / 12);
        droneBaseValue.textContent = noteNames[noteIndex] + octave;
        synth.setDroneBase(semitones);
    });
    
    droneVolume.addEventListener('input', () => {
        synth.setDroneVolume(parseFloat(droneVolume.value));
    });
    
    windVolume.addEventListener('input', () => {
        const vol = parseFloat(windVolume.value);
        synth.setWindVolume(vol * 0.3);
        windValue.textContent = `${Math.round(vol * 100)}%`;
    });
    
    waterVolume.addEventListener('input', () => {
        const vol = parseFloat(waterVolume.value);
        synth.setWaterVolume(vol * 0.2);
        waterValue.textContent = `${Math.round(vol * 100)}%`;
    });
}

function setupSequencer() {
    const playBtn = document.getElementById('seq-play-btn');
    const tempoSlider = document.getElementById('seq-tempo');
    const tempoValue = document.getElementById('seq-tempo-value');
    const randomnessSlider = document.getElementById('seq-randomness');
    const randomnessValue = document.getElementById('seq-randomness-value');
    
    // Play/Stop button
    playBtn.addEventListener('click', () => {
        if (sequencer.playing) {
            stopSequencer();
        } else {
            startSequencer();
        }
    });
    
    // Tempo control
    tempoSlider.addEventListener('input', () => {
        sequencer.tempo = parseInt(tempoSlider.value);
        tempoValue.textContent = `${sequencer.tempo} BPM`;
        
        if (sequencer.playing) {
            stopSequencer();
            startSequencer();
        }
    });
    
    // Randomness control
    randomnessSlider.addEventListener('input', () => {
        sequencer.randomness = parseFloat(randomnessSlider.value);
        randomnessValue.textContent = `${Math.round(sequencer.randomness * 100)}%`;
    });
    
    // Step clicks - toggle on/off and note selection
    document.querySelectorAll('.seq-step').forEach(step => {
        const select = step.querySelector('.note-select');
        
        step.addEventListener('click', (e) => {
            if (e.target === select) return;
            
            const row = step.closest('.seq-row');
            const instrument = row.dataset.instrument;
            const stepIndex = parseInt(step.dataset.step);
            
            if (step.classList.contains('active')) {
                // Turn off
                step.classList.remove('active');
                sequencer.patterns[instrument][stepIndex] = null;
            } else {
                // Turn on with default note (0) or selected note
                const noteValue = select.value !== '' ? parseInt(select.value) : 0;
                step.classList.add('active');
                sequencer.patterns[instrument][stepIndex] = noteValue;
                select.value = noteValue;
            }
        });
        
        // Note selection change
        select.addEventListener('change', () => {
            const row = step.closest('.seq-row');
            const instrument = row.dataset.instrument;
            const stepIndex = parseInt(step.dataset.step);
            
            if (select.value !== '') {
                step.classList.add('active');
                sequencer.patterns[instrument][stepIndex] = parseInt(select.value);
            } else {
                step.classList.remove('active');
                sequencer.patterns[instrument][stepIndex] = null;
            }
        });
    });
}

function startSequencer() {
    const playBtn = document.getElementById('seq-play-btn');
    sequencer.playing = true;
    sequencer.currentStep = 0;
    playBtn.classList.add('playing');
    
    const msPerStep = (60 / sequencer.tempo) * 1000 / 4; // 16th notes
    
    sequencer.intervalId = setInterval(() => {
        playStep(sequencer.currentStep);
        sequencer.currentStep = (sequencer.currentStep + 1) % 16;
    }, msPerStep);
}

function stopSequencer() {
    const playBtn = document.getElementById('seq-play-btn');
    sequencer.playing = false;
    playBtn.classList.remove('playing');
    
    if (sequencer.intervalId) {
        clearInterval(sequencer.intervalId);
        sequencer.intervalId = null;
    }
    
    // Clear step highlights
    document.querySelectorAll('.step-indicator').forEach(ind => {
        ind.classList.remove('current');
    });
}

function playStep(stepIndex) {
    // Update step indicator
    document.querySelectorAll('.step-indicator').forEach(ind => {
        ind.classList.toggle('current', parseInt(ind.dataset.step) === stepIndex);
    });
    
    // Play each instrument's note if active
    Object.keys(sequencer.patterns).forEach(instrument => {
        let noteIndex = sequencer.patterns[instrument][stepIndex];
        
        if (noteIndex !== null) {
            // Apply randomness
            if (sequencer.randomness > 0 && Math.random() < sequencer.randomness * 0.3) {
                // Random note variation
                noteIndex = Math.max(0, Math.min(6, noteIndex + Math.floor(Math.random() * 3) - 1));
            }
            
            // Random skip
            if (Math.random() > sequencer.randomness * 0.2) {
                synth.playInstrument(instrument, noteIndex);
                
                // Flash the step
                const step = document.querySelector(
                    `.seq-row[data-instrument="${instrument}"] .seq-step[data-step="${stepIndex}"]`
                );
                if (step) {
                    step.classList.add('playing');
                    setTimeout(() => step.classList.remove('playing'), 100);
                }
            }
        }
    });
}

function setupPitchWheel() {
    const wheel = document.getElementById('pitch-wheel');
    const handle = document.getElementById('pitch-handle');
    
    let isDragging = false;
    
    function updatePitch(y) {
        const rect = wheel.getBoundingClientRect();
        const relY = Math.max(0, Math.min(1, (y - rect.top) / rect.height));
        
        // Center is 0.5, range is -2 to +2 semitones
        const pitchBend = (0.5 - relY) * 4;
        
        handle.style.top = `${relY * 100}%`;
        synth.setPitchBend(pitchBend);
    }
    
    function resetPitch() {
        handle.style.top = '50%';
        synth.setPitchBend(0);
    }
    
    wheel.addEventListener('mousedown', (e) => {
        isDragging = true;
        updatePitch(e.clientY);
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            updatePitch(e.clientY);
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            resetPitch();
        }
    });
    
    // Touch support
    wheel.addEventListener('touchstart', (e) => {
        isDragging = true;
        updatePitch(e.touches[0].clientY);
        e.preventDefault();
    });
    
    wheel.addEventListener('touchmove', (e) => {
        if (isDragging) {
            updatePitch(e.touches[0].clientY);
            e.preventDefault();
        }
    });
    
    wheel.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            resetPitch();
        }
    });
}

function setupKeyboard() {
    // Keyboard note mapping
    const keyMap = {
        'a': { instrument: 'bowls', note: 0 },
        's': { instrument: 'bowls', note: 1 },
        'd': { instrument: 'bowls', note: 2 },
        'f': { instrument: 'bowls', note: 3 },
        'g': { instrument: 'bowls', note: 4 },
        'h': { instrument: 'bowls', note: 5 },
        'j': { instrument: 'bowls', note: 6 },
        'w': { instrument: 'wind', note: 0 },
        'e': { instrument: 'wind', note: 1 },
        't': { instrument: 'wind', note: 2 },
        'y': { instrument: 'wind', note: 3 },
        'i': { instrument: 'wind', note: 4 },
        'o': { instrument: 'wind', note: 5 },
    };
    
    const activeKeys = new Set();
    
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        
        const key = e.key.toLowerCase();
        
        // Drone toggle
        if (key === ' ' && !activeKeys.has(' ')) {
            e.preventDefault();
            document.getElementById('drone-btn').click();
            activeKeys.add(' ');
            return;
        }
        
        // Note playing
        if (keyMap[key] && !activeKeys.has(key)) {
            activeKeys.add(key);
            synth.playInstrument(keyMap[key].instrument, keyMap[key].note);
        }
    });
    
    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        activeKeys.delete(key);
    });
}

function setupVolumeControls() {
    // Master volume
    const masterVolume = document.getElementById('master-volume');
    masterVolume.addEventListener('input', () => {
        synth.setMasterVolume(parseFloat(masterVolume.value));
    });
    
    // Instrument volumes
    document.querySelectorAll('.inst-volume-slider').forEach(slider => {
        slider.addEventListener('input', () => {
            const instrument = slider.dataset.instrument;
            synth.setInstrumentVolume(instrument, parseFloat(slider.value));
        });
    });
}

function setupVisualization() {
    const canvas = document.getElementById('viz-canvas');
    const ctx = canvas.getContext('2d');
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resize();
    window.addEventListener('resize', resize);
    
    // Simple ambient particle visualization
    const particles = [];
    
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 1,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.3 + 0.1
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            
            // Wrap around
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
            ctx.fill();
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// ==================
// MIDI SUPPORT
// ==================

async function setupMIDI() {
    const statusEl = document.getElementById('midi-status');
    const inputSelect = document.getElementById('midi-input');
    const instrumentSelect = document.getElementById('midi-instrument');
    const midiSection = document.getElementById('midi-section');
    
    // Check for Web MIDI API support
    if (!navigator.requestMIDIAccess) {
        if (statusEl) {
            statusEl.textContent = 'Not supported';
            statusEl.classList.add('unsupported');
        }
        console.log('Web MIDI API not supported in this browser');
        return;
    }
    
    try {
        // Request MIDI access
        midi.access = await navigator.requestMIDIAccess({ sysex: false });
        midi.enabled = true;
        
        if (statusEl) {
            statusEl.textContent = 'Ready';
            statusEl.classList.add('ready');
        }
        
        // Populate input selector
        updateMIDIInputs();
        
        // Listen for device changes (hot-plug support)
        midi.access.onstatechange = (e) => {
            console.log('MIDI device state change:', e.port.name, e.port.state);
            updateMIDIInputs();
        };
        
        // Set up instrument selector
        if (instrumentSelect) {
            instrumentSelect.addEventListener('change', () => {
                midi.activeInstrument = instrumentSelect.value;
            });
        }
        
        // Set up input selector
        if (inputSelect) {
            inputSelect.addEventListener('change', () => {
                connectToMIDIInput(inputSelect.value);
            });
        }
        
        // Auto-connect to first available input
        if (midi.inputs.length > 0) {
            connectToMIDIInput(midi.inputs[0].id);
            if (inputSelect) inputSelect.value = midi.inputs[0].id;
        }
        
    } catch (err) {
        console.error('MIDI access denied:', err);
        if (statusEl) {
            statusEl.textContent = 'Access denied';
            statusEl.classList.add('error');
        }
    }
}

function updateMIDIInputs() {
    const inputSelect = document.getElementById('midi-input');
    if (!inputSelect || !midi.access) return;
    
    midi.inputs = [];
    inputSelect.innerHTML = '<option value="">Select MIDI device...</option>';
    
    for (const input of midi.access.inputs.values()) {
        if (input.state === 'connected') {
            midi.inputs.push(input);
            const option = document.createElement('option');
            option.value = input.id;
            option.textContent = input.name || `MIDI Input ${input.id}`;
            inputSelect.appendChild(option);
        }
    }
    
    // Update status
    const statusEl = document.getElementById('midi-status');
    if (statusEl && midi.enabled) {
        if (midi.inputs.length > 0) {
            statusEl.textContent = midi.activeInput ? 'Connected' : 'Ready';
            statusEl.className = 'midi-status ' + (midi.activeInput ? 'connected' : 'ready');
        } else {
            statusEl.textContent = 'No devices';
            statusEl.className = 'midi-status ready';
        }
    }
}

function connectToMIDIInput(inputId) {
    // Disconnect from previous input
    if (midi.activeInput) {
        midi.activeInput.onmidimessage = null;
    }
    
    if (!inputId) {
        midi.activeInput = null;
        updateMIDIInputs();
        return;
    }
    
    // Find and connect to the new input
    for (const input of midi.access.inputs.values()) {
        if (input.id === inputId) {
            midi.activeInput = input;
            input.onmidimessage = handleMIDIMessage;
            console.log('Connected to MIDI input:', input.name);
            
            const statusEl = document.getElementById('midi-status');
            if (statusEl) {
                statusEl.textContent = 'Connected';
                statusEl.className = 'midi-status connected';
            }
            break;
        }
    }
}

function handleMIDIMessage(event) {
    const [status, data1, data2] = event.data;
    const command = status >> 4;
    const channel = status & 0x0F;
    
    // Note On (command 9) with velocity > 0
    if (command === 9 && data2 > 0) {
        handleMIDINoteOn(data1, data2, channel);
    }
    // Note Off (command 8) or Note On with velocity 0
    else if (command === 8 || (command === 9 && data2 === 0)) {
        handleMIDINoteOff(data1, channel);
    }
    // Control Change (command 11)
    else if (command === 11) {
        handleMIDICC(data1, data2, channel);
    }
    // Pitch Bend (command 14)
    else if (command === 14) {
        const pitchBend = ((data2 << 7) | data1) - 8192;
        const semitones = (pitchBend / 8192) * 2; // ±2 semitones
        synth.setPitchBend(semitones);
    }
}

function handleMIDINoteOn(note, velocity, channel) {
    // Determine which instrument to use
    // Channel 0 (MIDI Ch 1): Use the UI-selected instrument
    // Channels 1-6 (MIDI Ch 2-7): Use channel-based instrument selection
    
    let instrument = midi.activeInstrument;
    
    // Only override for channels 1-6 (not channel 0, the default)
    if (channel >= 1 && channel <= 6) {
        instrument = midi.channelMap[channel];
    }
    
    // Map MIDI note to our pentatonic scale
    // Our scale: C, D#, F, G, A#, C, D# (indices 0-6)
    // MIDI notes: 60=C4, 63=D#4, 65=F4, 67=G4, 70=A#4, 72=C5, 75=D#5
    
    const noteIndex = midiNoteToScaleIndex(note);
    
    if (noteIndex >= 0 && noteIndex <= 6) {
        // Adjust volume based on velocity
        const velocityScale = velocity / 127;
        const originalVolume = synth.instrumentVolumes[instrument];
        synth.instrumentVolumes[instrument] = originalVolume * velocityScale;
        
        synth.playInstrument(instrument, noteIndex);
        
        // Restore original volume
        synth.instrumentVolumes[instrument] = originalVolume;
        
        // Flash corresponding UI element
        flashMIDINote(instrument, noteIndex);
    }
}

function handleMIDINoteOff(note, channel) {
    // Most of our sounds are one-shot, so note off isn't needed
    // But this could be used for drone control in the future
}

function handleMIDICC(cc, value, channel) {
    const normalized = value / 127;
    
    switch (cc) {
        case 1:  // Mod wheel -> Filter
        case 74: // Filter cutoff
            const filterFreq = 200 * Math.pow(40, normalized);
            synth.setFilter(filterFreq);
            break;
            
        case 7: // Volume
            synth.setMasterVolume(normalized);
            document.getElementById('master-volume').value = normalized;
            break;
            
        case 91: // Reverb
            synth.setReverb(normalized);
            break;
            
        case 64: // Sustain pedal -> Toggle drone
            if (value > 63) {
                if (!synth.droneActive) {
                    document.getElementById('drone-btn').click();
                }
            } else {
                if (synth.droneActive) {
                    document.getElementById('drone-btn').click();
                }
            }
            break;
    }
}

function midiNoteToScaleIndex(midiNote) {
    // Map any MIDI note to our 7-note pentatonic scale
    // C minor pentatonic: C, D#, F, G, A#
    // Extended: C, D#, F, G, A#, C, D# (over 2 octaves)
    
    const noteInOctave = midiNote % 12;
    const octaveOffset = Math.floor((midiNote - 48) / 12); // Base at C3
    
    // Map chromatic notes to pentatonic scale index
    const chromaticToScale = {
        0: 0,   // C
        1: 0,   // C#  -> C
        2: 1,   // D   -> D#
        3: 1,   // D#
        4: 2,   // E   -> F
        5: 2,   // F
        6: 3,   // F#  -> G
        7: 3,   // G
        8: 4,   // G#  -> A#
        9: 4,   // A   -> A#
        10: 4,  // A#
        11: 5,  // B   -> C (next octave conceptually)
    };
    
    let scaleIndex = chromaticToScale[noteInOctave];
    
    // Adjust for octave (each octave adds 5 to index in pentatonic)
    scaleIndex += (octaveOffset * 5);
    
    // Clamp to our 0-6 range
    return Math.max(0, Math.min(6, scaleIndex % 7));
}

function flashMIDINote(instrument, noteIndex) {
    // Find the corresponding UI element and flash it
    let selector;
    switch (instrument) {
        case 'bowls': selector = '.bowl'; break;
        case 'wind': selector = '.wind-note'; break;
        case 'strings': selector = '.string-note'; break;
        case 'horn': selector = '.horn-note'; break;
        case 'moorhen': selector = '.moorhen-note'; break;
        case 'oystercatcher': selector = '.oystercatcher-note'; break;
        case 'stick': selector = '.stick-note'; break;
        default: return;
    }
    
    const el = document.querySelector(`${selector}[data-note="${noteIndex}"]`);
    if (el) {
        flashElement(el);
    }
}
