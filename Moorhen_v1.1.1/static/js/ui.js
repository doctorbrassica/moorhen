/**
 * Moorhen - UI Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const startOverlay = document.getElementById('start-overlay');
    const startBtn = document.getElementById('start-btn');
    const mainInterface = document.getElementById('main-interface');
    
    // XY Pad
    const xyPad = document.getElementById('xy-pad');
    const xyCursor = document.getElementById('xy-cursor');
    const filterValue = document.getElementById('filter-value');
    const reverbValue = document.getElementById('reverb-value');
    
    // Volume
    const masterVolume = document.getElementById('master-volume');
    
    // Drone
    const droneBtn = document.getElementById('drone-btn');
    const droneVolumeSlider = document.getElementById('drone-volume');
    const droneBaseSlider = document.getElementById('drone-base');
    const droneBaseValue = document.getElementById('drone-base-value');
    const windVolumeSlider = document.getElementById('wind-volume');
    const windValue = document.getElementById('wind-value');
    const waterVolumeSlider = document.getElementById('water-volume');
    const waterValue = document.getElementById('water-value');
    
    // Pitch
    const pitchWheel = document.getElementById('pitch-wheel');
    const pitchHandle = document.getElementById('pitch-handle');
    
    // Sequencer
    const seqPlayBtn = document.getElementById('seq-play-btn');
    const seqTempo = document.getElementById('seq-tempo');
    const seqTempoValue = document.getElementById('seq-tempo-value');
    const seqRandomness = document.getElementById('seq-randomness');
    const seqRandomnessValue = document.getElementById('seq-randomness-value');
    
    // Note names for UI
    const noteNames = ['C2', 'D#2', 'F2', 'G2', 'A#2', 'C3', 'D#3'];
    
    // Start button
    startBtn.addEventListener('click', async () => {
        await synth.init();
        startOverlay.classList.add('hidden');
        mainInterface.classList.remove('hidden');
    });
    
    // XY Pad interaction
    let xyActive = false;
    
    function updateXY(e) {
        const rect = xyPad.getBoundingClientRect();
        let x, y;
        
        if (e.touches) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }
        
        x = Math.max(0, Math.min(rect.width, x));
        y = Math.max(0, Math.min(rect.height, y));
        
        const xPercent = x / rect.width;
        const yPercent = y / rect.height;
        
        // Update cursor position
        xyCursor.style.left = x + 'px';
        xyCursor.style.top = y + 'px';
        
        // Map to filter and reverb
        const filterFreq = 200 + xPercent * 4800; // 200-5000 Hz
        const reverbMix = 1 - yPercent; // Top = more reverb
        
        synth.setFilter(filterFreq);
        synth.setReverb(reverbMix);
        
        filterValue.textContent = `Filter: ${Math.round(filterFreq)} Hz`;
        reverbValue.textContent = `Space: ${Math.round(reverbMix * 100)}%`;
    }
    
    xyPad.addEventListener('mousedown', (e) => {
        xyActive = true;
        updateXY(e);
    });
    
    xyPad.addEventListener('mousemove', (e) => {
        if (xyActive) updateXY(e);
    });
    
    document.addEventListener('mouseup', () => {
        xyActive = false;
    });
    
    xyPad.addEventListener('touchstart', (e) => {
        e.preventDefault();
        xyActive = true;
        updateXY(e);
    });
    
    xyPad.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (xyActive) updateXY(e);
    });
    
    xyPad.addEventListener('touchend', () => {
        xyActive = false;
    });
    
    // Master volume
    masterVolume.addEventListener('input', (e) => {
        synth.setMasterVolume(parseFloat(e.target.value));
    });
    
    // Drone controls
    droneBtn.addEventListener('click', () => {
        if (synth.droneActive) {
            synth.stopDrone();
            droneBtn.classList.remove('active');
        } else {
            synth.startDrone(parseFloat(droneVolumeSlider.value));
            droneBtn.classList.add('active');
        }
    });
    
    droneVolumeSlider.addEventListener('input', (e) => {
        synth.setDroneVolume(parseFloat(e.target.value));
    });
    
    droneBaseSlider.addEventListener('input', (e) => {
        const semitones = parseInt(e.target.value);
        synth.setDroneBaseTone(semitones);
        // Calculate note name
        const baseNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const baseIndex = (0 + semitones + 12) % 12;
        const octave = semitones >= 0 ? 2 : (semitones >= -12 ? 1 : 0);
        droneBaseValue.textContent = baseNotes[baseIndex] + octave;
    });
    
    // Wind and water
    windVolumeSlider.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value);
        synth.setWindVolume(vol);
        windValue.textContent = Math.round(vol * 100) + '%';
    });
    
    waterVolumeSlider.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value);
        synth.setWaterVolume(vol);
        waterValue.textContent = Math.round(vol * 100) + '%';
    });
    
    // Pitch wheel
    let pitchActive = false;
    let pitchStartY = 0;
    
    function updatePitch(e) {
        const rect = pitchWheel.getBoundingClientRect();
        let y;
        
        if (e.touches) {
            y = e.touches[0].clientY - rect.top;
        } else {
            y = e.clientY - rect.top;
        }
        
        const centerY = rect.height / 2;
        const offset = (centerY - y) / centerY;
        const bend = Math.max(-2, Math.min(2, offset * 2));
        
        const handleY = 50 - (bend / 2 * 50);
        pitchHandle.style.top = handleY + '%';
        
        synth.setPitchBend(bend);
    }
    
    function resetPitch() {
        pitchHandle.style.top = '50%';
        synth.setPitchBend(0);
    }
    
    pitchWheel.addEventListener('mousedown', (e) => {
        pitchActive = true;
        updatePitch(e);
    });
    
    pitchWheel.addEventListener('mousemove', (e) => {
        if (pitchActive) updatePitch(e);
    });
    
    document.addEventListener('mouseup', () => {
        if (pitchActive) {
            pitchActive = false;
            resetPitch();
        }
    });
    
    pitchWheel.addEventListener('touchstart', (e) => {
        e.preventDefault();
        pitchActive = true;
        updatePitch(e);
    });
    
    pitchWheel.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (pitchActive) updatePitch(e);
    });
    
    pitchWheel.addEventListener('touchend', () => {
        pitchActive = false;
        resetPitch();
    });
    
    // Instrument note buttons
    const instruments = [
        { selector: '.bowl', instrument: 'bowls' },
        { selector: '.wind-note', instrument: 'wind' },
        { selector: '.string-note', instrument: 'strings' },
        { selector: '.horn-note', instrument: 'horn' },
        { selector: '.moorhen-note', instrument: 'moorhen' },
        { selector: '.oystercatcher-note', instrument: 'oystercatcher' }
    ];
    
    instruments.forEach(({ selector, instrument }) => {
        document.querySelectorAll(selector).forEach(el => {
            el.addEventListener('mousedown', () => {
                const noteIndex = parseInt(el.dataset.note);
                synth.playNote(instrument, noteIndex);
                el.classList.add('active');
            });
            
            el.addEventListener('mouseup', () => {
                el.classList.remove('active');
            });
            
            el.addEventListener('mouseleave', () => {
                el.classList.remove('active');
            });
            
            el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const noteIndex = parseInt(el.dataset.note);
                synth.playNote(instrument, noteIndex);
                el.classList.add('active');
            });
            
            el.addEventListener('touchend', () => {
                el.classList.remove('active');
            });
        });
    });
    
    // Sequencer controls
    seqPlayBtn.addEventListener('click', () => {
        if (synth.sequencer.isPlaying) {
            synth.stopSequencer();
            seqPlayBtn.classList.remove('playing');
        } else {
            synth.startSequencer();
            seqPlayBtn.classList.add('playing');
        }
    });
    
    seqTempo.addEventListener('input', (e) => {
        const bpm = parseInt(e.target.value);
        synth.setSequencerTempo(bpm);
        seqTempoValue.textContent = bpm + ' BPM';
    });
    
    seqRandomness.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        synth.setSequencerRandomness(value);
        seqRandomnessValue.textContent = Math.round(value * 100) + '%';
    });
    
    // Initialize sequencer grid
    const seqInstruments = ['bowls', 'wind', 'strings', 'horn', 'moorhen', 'oystercatcher'];
    
    seqInstruments.forEach(inst => {
        const row = document.querySelector(`.seq-row[data-instrument="${inst}"]`);
        if (!row) return;
        
        const steps = row.querySelectorAll('.seq-step');
        steps.forEach((step, i) => {
            const select = step.querySelector('.note-select');
            
            // Populate note options
            noteNames.forEach((name, idx) => {
                const option = document.createElement('option');
                option.value = idx;
                option.textContent = name;
                select.appendChild(option);
            });
            
            // Set initial value
            select.value = synth.sequencer[inst][i].noteIndex;
            
            // Update displayed note label
            const updateNoteLabel = () => {
                step.setAttribute('data-note-label', noteNames[synth.sequencer[inst][i].noteIndex]);
            };
            updateNoteLabel();
            
            // Note selection change
            select.addEventListener('change', (e) => {
                synth.sequencer[inst][i].noteIndex = parseInt(e.target.value);
                updateNoteLabel();
                select.blur(); // Hide dropdown after selection
            });
            
            // Hide dropdown when losing focus
            select.addEventListener('blur', () => {
                step.classList.remove('selecting');
            });
            
            // Left-click: Toggle step active
            step.addEventListener('click', (e) => {
                if (step.classList.contains('selecting')) return;
                synth.sequencer[inst][i].active = !synth.sequencer[inst][i].active;
                step.classList.toggle('active', synth.sequencer[inst][i].active);
            });
            
            // Right-click: Show note dropdown
            step.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                step.classList.add('selecting');
                select.focus();
                // Try to open the dropdown (works in some browsers)
                if (typeof select.showPicker === 'function') {
                    try { select.showPicker(); } catch (err) {}
                }
            });
        });
        
        // Volume slider
        const volSlider = row.querySelector('.inst-volume-slider');
        if (volSlider) {
            volSlider.addEventListener('input', (e) => {
                synth.setInstrumentVolume(inst, parseFloat(e.target.value));
            });
        }
    });
    
    // Sequencer step indicator
    synth.onStepChange = (step) => {
        // Clear previous current
        document.querySelectorAll('.seq-step.current, .step-indicator.current').forEach(el => {
            el.classList.remove('current');
        });
        
        // Highlight current step
        document.querySelectorAll(`.seq-step[data-step="${step}"]`).forEach(el => {
            el.classList.add('current');
        });
        document.querySelectorAll(`.step-indicator[data-step="${step}"]`).forEach(el => {
            el.classList.add('current');
        });
    };
    
    // Keyboard controls
    const keyMap = {
        'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4, 'h': 5, 'j': 6,
        'w': 0, 'e': 1, 't': 2, 'y': 3, 'i': 4, 'o': 5
    };
    
    document.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        
        // Space toggles drone
        if (e.code === 'Space') {
            e.preventDefault();
            droneBtn.click();
            return;
        }
        
        const key = e.key.toLowerCase();
        if (keyMap.hasOwnProperty(key)) {
            const noteIndex = keyMap[key];
            synth.playNote('bowls', noteIndex);
            
            // Visual feedback
            const bowl = document.querySelector(`.bowl[data-note="${noteIndex}"]`);
            if (bowl) {
                bowl.classList.add('active');
                setTimeout(() => bowl.classList.remove('active'), 200);
            }
        }
    });
    
    // Visualization canvas
    const canvas = document.getElementById('viz-canvas');
    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Simple ambient particle visualization
    const particles = [];
    
    for (let i = 0; i < 30; i++) {
        particles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: Math.random() * 3 + 1,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.3
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(150, 180, 170, ${p.opacity})`;
            ctx.fill();
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
});
