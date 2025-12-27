/**
 * Moorhen - UI Controller
 * Handles all user interactions, visual feedback, and expression controls
 */

class HimalayanUI {
    constructor(synth) {
        this.synth = synth;
        this.elements = {};
        this.isInitialized = false;
        this.vizCtx = null;
        this.animationFrame = null;
        
        // Bowl key mappings (keyboard to bowl index)
        this.bowlKeys = ['a', 's', 'd', 'f', 'g', 'h', 'j'];
        
        this.init();
    }
    
    init() {
        // Cache DOM elements
        this.elements = {
            startOverlay: document.getElementById('start-overlay'),
            startBtn: document.getElementById('start-btn'),
            mainInterface: document.getElementById('main-interface'),
            xyPad: document.getElementById('xy-pad'),
            xyCursor: document.getElementById('xy-cursor'),
            droneBtn: document.getElementById('drone-btn'),
            masterVolume: document.getElementById('master-volume'),
            droneVolume: document.getElementById('drone-volume'),
            droneBase: document.getElementById('drone-base'),
            droneBaseValue: document.getElementById('drone-base-value'),
            windVolume: document.getElementById('wind-volume'),
            windValue: document.getElementById('wind-value'),
            waterVolume: document.getElementById('water-volume'),
            waterValue: document.getElementById('water-value'),
            pitchWheel: document.getElementById('pitch-wheel'),
            pitchHandle: document.getElementById('pitch-handle'),
            filterValue: document.getElementById('filter-value'),
            reverbValue: document.getElementById('reverb-value'),
            vizCanvas: document.getElementById('viz-canvas'),
            bowls: document.querySelectorAll('.bowl'),
            windNotes: document.querySelectorAll('.wind-note'),
            stringNotes: document.querySelectorAll('.string-note'),
            hornNotes: document.querySelectorAll('.horn-note'),
            moorhenNotes: document.querySelectorAll('.moorhen-note'),
            oystercatcherNotes: document.querySelectorAll('.oystercatcher-note'),
            seqPlayBtn: document.getElementById('seq-play-btn'),
            seqTempo: document.getElementById('seq-tempo'),
            seqTempoValue: document.getElementById('seq-tempo-value'),
            seqRandomness: document.getElementById('seq-randomness'),
            seqRandomnessValue: document.getElementById('seq-randomness-value'),
            seqRows: document.querySelectorAll('.seq-row[data-instrument]'),
            stepIndicators: document.querySelectorAll('.step-indicator'),
            instVolumeSliders: document.querySelectorAll('.inst-volume-slider')
        };
        
        // Note names for sequencer
        this.noteNames = ['C', 'D♯', 'F', 'G', 'A♯', 'C', 'D♯'];
        
        this.setupStartButton();
        this.setupXYPad();
        this.setupDroneButton();
        this.setupVolumeControls();
        this.setupPitchWheel();
        this.setupBowls();
        this.setupWindInstrument();
        this.setupStringInstrument();
        this.setupHornInstrument();
        this.setupMoorhenInstrument();
        this.setupOystercatcherInstrument();
        this.setupSequencer();
        this.setupKeyboardBowls();
        this.setupVisualization();
        
        // Connect synth callbacks
        this.synth.onNotePlay = (index, freq) => this.onNotePlay(index, freq);
        this.synth.onExpressionChange = (x, y) => this.onExpressionChange(x, y);
    }
    
    setupStartButton() {
        this.elements.startBtn.addEventListener('click', async () => {
            await this.synth.init();
            this.elements.startOverlay.classList.add('hidden');
            this.elements.mainInterface.classList.remove('hidden');
            this.isInitialized = true;
            this.startVisualization();
        });
        
        // Also allow spacebar to start
        document.addEventListener('keydown', async (e) => {
            if (e.key === ' ' && !this.isInitialized) {
                e.preventDefault();
                await this.synth.init();
                this.elements.startOverlay.classList.add('hidden');
                this.elements.mainInterface.classList.remove('hidden');
                this.isInitialized = true;
                this.startVisualization();
            }
        }, { once: false });
    }
    
    setupXYPad() {
        const pad = this.elements.xyPad;
        const cursor = this.elements.xyCursor;
        let isActive = false;
        
        const updatePosition = (clientX, clientY) => {
            const rect = pad.getBoundingClientRect();
            let x = (clientX - rect.left) / rect.width;
            let y = (clientY - rect.top) / rect.height;
            
            // Clamp values
            x = Math.max(0, Math.min(1, x));
            y = Math.max(0, Math.min(1, y));
            
            // Update cursor position
            cursor.style.left = `${x * 100}%`;
            cursor.style.top = `${y * 100}%`;
            
            // Update synth expression (y is inverted for musical sense)
            this.synth.updateExpression(x, 1 - y);
        };
        
        // Mouse events
        pad.addEventListener('mousedown', (e) => {
            isActive = true;
            cursor.classList.add('active');
            updatePosition(e.clientX, e.clientY);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isActive) {
                updatePosition(e.clientX, e.clientY);
            }
        });
        
        document.addEventListener('mouseup', () => {
            isActive = false;
            cursor.classList.remove('active');
        });
        
        // Touch events for trackpad/touchscreen
        pad.addEventListener('touchstart', (e) => {
            e.preventDefault();
            isActive = true;
            cursor.classList.add('active');
            const touch = e.touches[0];
            updatePosition(touch.clientX, touch.clientY);
        });
        
        pad.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (isActive) {
                const touch = e.touches[0];
                updatePosition(touch.clientX, touch.clientY);
            }
        });
        
        pad.addEventListener('touchend', () => {
            isActive = false;
            cursor.classList.remove('active');
        });
    }
    
    setupDroneButton() {
        const btn = this.elements.droneBtn;
        let droneActive = false;
        
        btn.addEventListener('click', async () => {
            if (!this.isInitialized) {
                await this.synth.init();
                this.isInitialized = true;
            }
            
            if (droneActive) {
                this.synth.stopDrone();
                btn.classList.remove('active');
                droneActive = false;
            } else {
                this.synth.startDrone();
                btn.classList.add('active');
                droneActive = true;
            }
        });
        
        // Sync with keyboard space toggle
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' && this.isInitialized) {
                droneActive = !droneActive;
                if (droneActive) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
    }
    
    setupVolumeControls() {
        this.elements.masterVolume.addEventListener('input', (e) => {
            this.synth.setVolume(parseFloat(e.target.value));
        });
        
        this.elements.droneVolume.addEventListener('input', (e) => {
            this.synth.setDroneVolume(parseFloat(e.target.value));
        });
        
        // Drone base tone slider
        this.elements.droneBase.addEventListener('input', (e) => {
            const semitones = parseInt(e.target.value);
            const noteName = this.synth.setDroneBase(semitones);
            this.elements.droneBaseValue.textContent = noteName;
        });
        
        // Wind volume slider
        this.elements.windVolume.addEventListener('input', async (e) => {
            if (!this.isInitialized) {
                await this.synth.init();
                this.isInitialized = true;
            }
            const volume = parseFloat(e.target.value);
            this.synth.setWindVolume(volume);
            this.elements.windValue.textContent = `${Math.round(volume * 100)}%`;
        });
        
        // Water volume slider
        this.elements.waterVolume.addEventListener('input', async (e) => {
            if (!this.isInitialized) {
                await this.synth.init();
                this.isInitialized = true;
            }
            const volume = parseFloat(e.target.value);
            this.synth.setWaterVolume(volume);
            this.elements.waterValue.textContent = `${Math.round(volume * 100)}%`;
        });
    }
    
    setupPitchWheel() {
        const wheel = this.elements.pitchWheel;
        const handle = this.elements.pitchHandle;
        const track = wheel.querySelector('.pitch-track');
        let isActive = false;
        let startY = 0;
        let startHandleTop = 50;
        
        const updatePitch = (clientY) => {
            const rect = track.getBoundingClientRect();
            let y = (clientY - rect.top) / rect.height;
            y = Math.max(0.1, Math.min(0.9, y));
            
            // Position handle
            handle.style.top = `${y * 100}%`;
            
            // Calculate pitch bend (-1 to 1)
            const bend = (0.5 - y) * 2;
            this.synth.setPitchBend(bend);
        };
        
        const resetPitch = () => {
            handle.style.top = '50%';
            this.synth.setPitchBend(0);
        };
        
        // Mouse events
        handle.addEventListener('mousedown', (e) => {
            isActive = true;
            handle.classList.add('active');
            startY = e.clientY;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isActive) {
                updatePitch(e.clientY);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isActive) {
                isActive = false;
                handle.classList.remove('active');
                // Spring back to center
                resetPitch();
            }
        });
        
        // Touch events
        handle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            isActive = true;
            handle.classList.add('active');
        });
        
        document.addEventListener('touchmove', (e) => {
            if (isActive) {
                const touch = e.touches[0];
                updatePitch(touch.clientY);
            }
        });
        
        document.addEventListener('touchend', () => {
            if (isActive) {
                isActive = false;
                handle.classList.remove('active');
                resetPitch();
            }
        });
    }
    
    setupBowls() {
        this.elements.bowls.forEach((bowl, index) => {
            const freq = parseFloat(bowl.dataset.freq);
            
            // Click to strike bowl
            bowl.addEventListener('mousedown', async () => {
                if (!this.isInitialized) {
                    await this.synth.init();
                    this.isInitialized = true;
                }
                
                this.synth.strikeBowl(freq, 0.8);
                bowl.classList.add('active');
                
                // Remove active class after animation
                setTimeout(() => {
                    bowl.classList.remove('active');
                }, 1500);
            });
            
            // Touch support
            bowl.addEventListener('touchstart', async (e) => {
                e.preventDefault();
                if (!this.isInitialized) {
                    await this.synth.init();
                    this.isInitialized = true;
                }
                
                this.synth.strikeBowl(freq, 0.8);
                bowl.classList.add('active');
                
                setTimeout(() => {
                    bowl.classList.remove('active');
                }, 1500);
            });
        });
    }
    
    setupWindInstrument() {
        this.elements.windNotes.forEach((note, index) => {
            const freq = parseFloat(note.dataset.freq);
            
            note.addEventListener('mousedown', async () => {
                if (!this.isInitialized) {
                    await this.synth.init();
                    this.isInitialized = true;
                }
                
                this.synth.playWind(freq, 0.7);
                note.classList.add('active');
                
                setTimeout(() => {
                    note.classList.remove('active');
                }, 800);
            });
            
            note.addEventListener('touchstart', async (e) => {
                e.preventDefault();
                if (!this.isInitialized) {
                    await this.synth.init();
                    this.isInitialized = true;
                }
                
                this.synth.playWind(freq, 0.7);
                note.classList.add('active');
                
                setTimeout(() => {
                    note.classList.remove('active');
                }, 800);
            });
        });
    }
    
    setupStringInstrument() {
        this.elements.stringNotes.forEach((note, index) => {
            const freq = parseFloat(note.dataset.freq);
            
            note.addEventListener('mousedown', async () => {
                if (!this.isInitialized) {
                    await this.synth.init();
                    this.isInitialized = true;
                }
                
                this.synth.playString(freq, 0.7);
                note.classList.add('active');
                
                setTimeout(() => {
                    note.classList.remove('active');
                }, 300);
            });
            
            note.addEventListener('touchstart', async (e) => {
                e.preventDefault();
                if (!this.isInitialized) {
                    await this.synth.init();
                    this.isInitialized = true;
                }
                
                this.synth.playString(freq, 0.7);
                note.classList.add('active');
                
                setTimeout(() => {
                    note.classList.remove('active');
                }, 300);
            });
        });
    }
    
    setupHornInstrument() {
        this.elements.hornNotes.forEach((note, index) => {
            const freq = parseFloat(note.dataset.freq);
            
            note.addEventListener('mousedown', async () => {
                if (!this.isInitialized) {
                    await this.synth.init();
                    this.isInitialized = true;
                }
                
                this.synth.playHorn(freq, 0.6);
                note.classList.add('active');
                
                setTimeout(() => {
                    note.classList.remove('active');
                }, 2500);
            });
            
            note.addEventListener('touchstart', async (e) => {
                e.preventDefault();
                if (!this.isInitialized) {
                    await this.synth.init();
                    this.isInitialized = true;
                }
                
                this.synth.playHorn(freq, 0.6);
                note.classList.add('active');
                
                setTimeout(() => {
                    note.classList.remove('active');
                }, 2500);
            });
        });
    }
    
    setupMoorhenInstrument() {
        this.elements.moorhenNotes.forEach((note, index) => {
            const freq = parseFloat(note.dataset.freq);
            
            note.addEventListener('mousedown', async () => {
                if (!this.isInitialized) {
                    await this.synth.init();
                    this.isInitialized = true;
                }
                
                this.synth.playMoorhen(freq, 0.5);
                note.classList.add('active');
                
                setTimeout(() => {
                    note.classList.remove('active');
                }, 500);
            });
            
            note.addEventListener('touchstart', async (e) => {
                e.preventDefault();
                if (!this.isInitialized) {
                    await this.synth.init();
                    this.isInitialized = true;
                }
                
                this.synth.playMoorhen(freq, 0.5);
                note.classList.add('active');
                
                setTimeout(() => {
                    note.classList.remove('active');
                }, 500);
            });
        });
    }
    
    setupOystercatcherInstrument() {
        this.elements.oystercatcherNotes.forEach((note, index) => {
            const freq = parseFloat(note.dataset.freq);
            
            note.addEventListener('mousedown', async () => {
                if (!this.isInitialized) {
                    await this.synth.init();
                    this.isInitialized = true;
                }
                
                this.synth.playOystercatcher(freq, 0.4);
                note.classList.add('active');
                
                setTimeout(() => {
                    note.classList.remove('active');
                }, 400);
            });
            
            note.addEventListener('touchstart', async (e) => {
                e.preventDefault();
                if (!this.isInitialized) {
                    await this.synth.init();
                    this.isInitialized = true;
                }
                
                this.synth.playOystercatcher(freq, 0.4);
                note.classList.add('active');
                
                setTimeout(() => {
                    note.classList.remove('active');
                }, 400);
            });
        });
    }
    
    setupSequencer() {
        // Populate note selects
        this.elements.seqRows.forEach(row => {
            const instrument = row.dataset.instrument;
            const steps = row.querySelectorAll('.seq-step');
            
            steps.forEach((step, stepIndex) => {
                const select = step.querySelector('.note-select');
                
                // Add note options
                this.noteNames.forEach((name, noteIndex) => {
                    const option = document.createElement('option');
                    option.value = noteIndex;
                    option.textContent = name;
                    if (noteIndex === stepIndex % 7) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
                
                // Handle note selection change
                select.addEventListener('change', (e) => {
                    e.stopPropagation();
                    const noteIndex = parseInt(e.target.value);
                    this.synth.setSequencerStep(instrument, stepIndex, noteIndex, undefined);
                });
                
                // Handle step toggle (click on step, not select)
                step.addEventListener('click', (e) => {
                    if (e.target.tagName === 'SELECT') return;
                    
                    const isActive = this.synth.toggleSequencerStep(instrument, stepIndex);
                    step.classList.toggle('active', isActive);
                });
            });
        });
        
        // Play/Stop button
        this.elements.seqPlayBtn.addEventListener('click', async () => {
            if (!this.isInitialized) {
                await this.synth.init();
                this.isInitialized = true;
            }
            
            if (this.synth.sequencer.isPlaying) {
                this.synth.stopSequencer();
                this.elements.seqPlayBtn.classList.remove('playing');
            } else {
                this.synth.startSequencer();
                this.elements.seqPlayBtn.classList.add('playing');
            }
        });
        
        // Tempo control
        this.elements.seqTempo.addEventListener('input', (e) => {
            const bpm = parseInt(e.target.value);
            this.synth.setSequencerBPM(bpm);
            this.elements.seqTempoValue.textContent = `${bpm} BPM`;
        });
        
        // Randomness control
        this.elements.seqRandomness.addEventListener('input', (e) => {
            const randomness = parseFloat(e.target.value);
            this.synth.setSequencerRandomness(randomness);
            this.elements.seqRandomnessValue.textContent = `${Math.round(randomness * 100)}%`;
        });
        
        // Instrument volume sliders
        this.elements.instVolumeSliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const instrument = slider.dataset.instrument;
                const volume = parseFloat(e.target.value);
                this.synth.setInstrumentVolume(instrument, volume);
            });
        });
        
        // Connect sequencer step callback
        this.synth.onSequencerStep = (step) => {
            this.updateSequencerDisplay(step);
        };
    }
    
    updateSequencerDisplay(currentStep) {
        // Update step indicators
        this.elements.stepIndicators.forEach((indicator, i) => {
            indicator.classList.toggle('current', i === currentStep);
        });
        
        // Update step highlights in each row
        this.elements.seqRows.forEach(row => {
            const steps = row.querySelectorAll('.seq-step');
            steps.forEach((step, i) => {
                step.classList.toggle('current', i === currentStep);
            });
        });
    }
    
    setupKeyboardBowls() {
        // Map keyboard keys to bowls
        document.addEventListener('keydown', async (e) => {
            if (e.repeat || !this.isInitialized) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            
            const keyIndex = this.bowlKeys.indexOf(e.key.toLowerCase());
            if (keyIndex !== -1 && keyIndex < this.elements.bowls.length) {
                const bowl = this.elements.bowls[keyIndex];
                bowl.classList.add('active');
                
                setTimeout(() => {
                    bowl.classList.remove('active');
                }, 1500);
            }
        });
    }
    
    onNotePlay(index, freq) {
        // Visual feedback when note plays
        const bowlIndex = index % this.elements.bowls.length;
        const bowl = this.elements.bowls[bowlIndex];
        if (bowl) {
            bowl.classList.add('active');
            setTimeout(() => bowl.classList.remove('active'), 1500);
        }
    }
    
    onExpressionChange(x, y) {
        // Update display values
        const filterHz = Math.round(200 + x * 7800);
        const spacePercent = Math.round(y * 100);
        
        this.elements.filterValue.textContent = `Filter: ${filterHz} Hz`;
        this.elements.reverbValue.textContent = `Space: ${spacePercent}%`;
    }
    
    setupVisualization() {
        const canvas = this.elements.vizCanvas;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.vizCtx = canvas.getContext('2d');
        
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }
    
    startVisualization() {
        const ctx = this.vizCtx;
        const canvas = this.elements.vizCanvas;
        
        let particles = [];
        const maxParticles = 50;
        
        // Create particle when sound plays
        this.synth.onNotePlay = (index, freq) => {
            this.onNotePlay(index, freq);
            
            // Add particles
            for (let i = 0; i < 5; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: canvas.height + 20,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -1 - Math.random() * 3,
                    radius: 2 + Math.random() * 4,
                    alpha: 0.8,
                    hue: 35 + Math.random() * 20,
                    life: 1
                });
            }
        };
        
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw and update particles
            particles = particles.filter(p => p.life > 0);
            
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${p.alpha * p.life})`;
                ctx.fill();
                
                // Add glow
                ctx.shadowBlur = 20;
                ctx.shadowColor = `hsla(${p.hue}, 70%, 60%, 0.5)`;
                
                // Update
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.02; // Slight upward float
                p.life -= 0.005;
            });
            
            // Limit particles
            if (particles.length > maxParticles) {
                particles = particles.slice(-maxParticles);
            }
            
            // Draw ambient glow based on drone
            if (this.synth.droneVoices.length > 0) {
                const gradient = ctx.createRadialGradient(
                    canvas.width / 2, canvas.height / 2, 0,
                    canvas.width / 2, canvas.height / 2, canvas.width / 2
                );
                gradient.addColorStop(0, 'rgba(212, 168, 83, 0.03)');
                gradient.addColorStop(0.5, 'rgba(212, 168, 83, 0.01)');
                gradient.addColorStop(1, 'transparent');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const ui = new HimalayanUI(window.HimalayanSynth);
    console.log('🐦 Moorhen UI initialized');
});

