// Fortune Teller App - Frontend Logic
class FortuneTellerApp {
  constructor() {
    this.workerUrl = window.CONFIG.WORKER_URL;
    this.recognition = null;
    this.transcription = '';
    this.interimTranscript = '';
    this.isRecording = false;
    this.hasRecordingStarted = false;
    this.recordingStartTime = null;
    this.recordingTimer = null;
    
    this.init();
  }

  init() {
    this.cacheElements();
    this.createVisualizer();
    this.checkBrowserSupport();
    this.bindEvents();
  }

  cacheElements() {
    this.textModeBtn = document.getElementById('textModeBtn');
    this.voiceModeBtn = document.getElementById('voiceModeBtn');
    this.textSection = document.getElementById('textSection');
    this.textInput = document.getElementById('textInput');
    this.textSubmitBtn = document.getElementById('textSubmitBtn');
    this.voiceSection = document.getElementById('voiceSection');
    this.recordBtn = document.getElementById('recordBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.recordingStatus = document.getElementById('recordingStatus');
    this.recordingTimerEl = document.querySelector('.recording-timer');
    this.playbackSection = document.getElementById('playbackSection');
    this.transcriptionText = document.getElementById('transcriptionText');
    this.playBtn = document.getElementById('playBtn');
    this.retakeBtn = document.getElementById('retakeBtn');
    this.voiceSubmitBtn = document.getElementById('voiceSubmitBtn');
    this.voiceError = document.getElementById('voiceError');
    this.loadingSection = document.getElementById('loadingSection');
    this.resultSection = document.getElementById('resultSection');
    this.fortuneText = document.getElementById('fortuneText');
    this.newFortuneBtn = document.getElementById('newFortuneBtn');
    this.errorSection = document.getElementById('errorSection');
    this.errorText = document.getElementById('errorText');
    this.retryBtn = document.getElementById('retryBtn');
    this.voiceControls = document.getElementById('voiceControls');
    this.catSpeechBubble = document.getElementById('catSpeechBubble');
  }

  createVisualizer() {
    // Create status text for transcription
    this.liveTranscriptionEl = document.createElement('p');
    this.liveTranscriptionEl.className = 'live-transcription';
    this.liveTranscriptionEl.style.cssText = 'font-style: italic; opacity: 0.7; margin-top: 0.5rem; min-height: 1.5em; text-align: center;';
    this.recordingStatus.appendChild(this.liveTranscriptionEl);
  }

  checkBrowserSupport() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    
    if (!SpeechRecognition) {
      console.error('Web Speech API not supported');
      this.voiceModeBtn.disabled = true;
      this.voiceModeBtn.style.opacity = '0.5';
      this.voiceModeBtn.title = 'Voice input not supported. Use Chrome, Edge, or Safari.';
      this.showVoiceError('❌ Voice input not supported. Please use Chrome, Edge, or Safari.');
    } else if (!AudioContext) {
      console.error('Web Audio API not supported');
      this.showVoiceError('❌ Audio visualization not supported.');
    } else {
      console.log('✅ All APIs supported');
    }
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    
    this.recognition.onstart = () => {
      console.log('✅ Speech recognition started');
      this.isRecording = true;
    };
    
    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      if (finalTranscript) {
        this.transcription += finalTranscript;
        console.log('📝 Final transcript added:', finalTranscript);
      }
      
      this.interimTranscript = interimTranscript;
      
      // Update live transcription display
      const displayText = (this.transcription + this.interimTranscript).trim();
      if (this.liveTranscriptionEl) {
        this.liveTranscriptionEl.textContent = displayText || 'Listening... Speak now';
        this.liveTranscriptionEl.style.opacity = displayText ? '1' : '0.7';
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error);
      
      if (event.error === 'no-speech') {
        // Continue listening
        return;
      } else if (event.error === 'aborted') {
        // User stopped manually
        return;
      }
      
      let errorMsg = '';
      if (event.error === 'audio-capture') {
        errorMsg = '❌ No microphone found. Please check your microphone connection.';
      } else if (event.error === 'not-allowed') {
        errorMsg = '❌ Microphone access denied. Click the 🔒 icon in the address bar and allow microphone access.';
      } else if (event.error === 'network') {
        errorMsg = '❌ Network error. Please check your internet connection.';
      } else {
        errorMsg = `❌ Error: ${event.error}`;
      }
      
      this.showVoiceError(errorMsg);
      this.stopRecording();
    };
    
    this.recognition.onend = () => {
      console.log('🛑 Speech recognition ended');
      
      if (this.isRecording) {
        // Auto-restart if still recording
        setTimeout(() => {
          if (this.isRecording) {
            try {
              this.recognition.start();
              console.log('🔄 Restarted speech recognition');
            } catch (e) {
              console.error('Failed to restart:', e);
            }
          }
        }, 100);
      }
    };
  }

  async initAudioContext() {
    try {
      // Request microphone access
      await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      console.log('✅ Microphone access granted');
      return true;
    } catch (error) {
      console.error('❌ Microphone error:', error);
      
      if (error.name === 'NotAllowedError') {
        this.showVoiceError('❌ Microphone access denied. Please allow microphone permissions in your browser.');
      } else if (error.name === 'NotFoundError') {
        this.showVoiceError('❌ No microphone found. Please connect a microphone.');
      } else {
        this.showVoiceError(`❌ Microphone error: ${error.message}`);
      }
      return false;
    }
  }

  startVisualizer() {
    // Visualizer removed - no canvas needed
  }

  stopVisualizer() {
    // Visualizer removed - no canvas to clean up
  }

  bindEvents() {
    this.textModeBtn.addEventListener('click', () => this.switchMode('text'));
    this.voiceModeBtn.addEventListener('click', () => this.switchMode('voice'));
    this.textSubmitBtn.addEventListener('click', () => this.submitText());
    this.recordBtn.addEventListener('click', () => this.startRecording());
    this.stopBtn.addEventListener('click', () => this.stopRecording());
    this.playBtn.addEventListener('click', () => this.playRecording());
    this.retakeBtn.addEventListener('click', () => this.retakeRecording());
    this.voiceSubmitBtn.addEventListener('click', () => this.submitVoice());
    this.newFortuneBtn.addEventListener('click', () => this.reset());
    this.retryBtn.addEventListener('click', () => this.reset());
    
    // Record button hover effect - stretch icon toward cursor
    this.recordBtn.addEventListener('mousemove', (e) => {
      const rect = this.recordBtn.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      this.recordBtn.style.setProperty('--mouse-x', x);
      this.recordBtn.style.setProperty('--mouse-y', y);
    });
    
    this.recordBtn.addEventListener('mouseleave', () => {
      this.recordBtn.style.setProperty('--mouse-x', 0.5);
      this.recordBtn.style.setProperty('--mouse-y', 0.5);
    });
    
    this.textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.submitText();
      }
    });
  }

  switchMode(mode) {
    this.textModeBtn.classList.toggle('active', mode === 'text');
    this.voiceModeBtn.classList.toggle('active', mode === 'voice');
    this.textSection.classList.toggle('active', mode === 'text');
    this.voiceSection.classList.toggle('active', mode === 'voice');
    
    // Update cat speech bubble text and position based on mode
    if (this.catSpeechBubble) {
      if (mode === 'text') {
        this.catSpeechBubble.innerHTML = 'For text any <strong>language</strong> is welcome';
        this.catSpeechBubble.classList.remove('position-right');
        this.catSpeechBubble.classList.add('position-left');
      } else {
        this.catSpeechBubble.innerHTML = 'Use Only <strong>English</strong> 🇬🇧 for voice please';
        this.catSpeechBubble.classList.remove('position-left');
        this.catSpeechBubble.classList.add('position-right');
      }
    }
    
    if (mode === 'text') this.resetVoiceSection();
  }

  resetVoiceSection() {
    this.stopRecording();
    this.transcription = '';
    this.interimTranscript = '';
    this.hasRecordingStarted = false;
    this.playbackSection.classList.add('hidden');
    this.voiceError.classList.add('hidden');
    this.recordBtn.classList.remove('hidden');
    this.stopBtn.classList.add('hidden');
    this.recordingStatus.classList.add('hidden');
    this.stopVisualizer();
    if (this.liveTranscriptionEl) {
      this.liveTranscriptionEl.textContent = '';
    }
  }

  async startRecording() {
    // Clear any previous errors
    this.voiceError.classList.add('hidden');
    
    // Initialize audio context first (this will request microphone permission)
    const audioInitialized = await this.initAudioContext();
    if (!audioInitialized) {
      return;
    }
    
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.showVoiceError('❌ Speech recognition not supported in this browser.');
      return;
    }
    
    // Initialize recognition if not already done
    if (!this.recognition) {
      this.initSpeechRecognition();
    }
    
    try {
      // Reset state
      this.transcription = '';
      this.interimTranscript = '';
      this.isRecording = true;
      this.hasRecordingStarted = true;
      
      if (this.liveTranscriptionEl) {
        this.liveTranscriptionEl.textContent = 'Speak now...';
      }
      
      // Start recognition
      this.recognition.start();
      
      // Start visualizer
      this.startVisualizer();
      
      // Update UI
      this.recordBtn.classList.add('hidden');
      this.stopBtn.classList.remove('hidden');
      this.recordingStatus.classList.remove('hidden');
      this.playbackSection.classList.add('hidden');
      
      // Start timer
      this.recordingStartTime = Date.now();
      this.startRecordingTimer();
      
      console.log('✅ Recording started successfully');
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      this.showVoiceError('❌ Could not start recording: ' + error.message);
      this.stopRecording();
    }
  }

  stopRecording() {
    this.isRecording = false;
    
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Already stopped
      }
    }
    
    this.stopVisualizer();
    this.stopRecordingTimer();
    
    this.recordBtn.classList.remove('hidden');
    this.stopBtn.classList.add('hidden');
    this.recordingStatus.classList.add('hidden');
    
    // Show playback section if we have transcription
    setTimeout(() => this.showPlayback(), 100);
  }

  showPlayback() {
    const fullTranscript = (this.transcription + this.interimTranscript).trim();
    if (fullTranscript) {
      this.transcriptionText.textContent = fullTranscript;
      this.playbackSection.classList.remove('hidden');
      console.log('✅ Playback shown with transcript:', fullTranscript);
    } else if (this.hasRecordingStarted) {
      // Only show error if user actually clicked Record
      this.showVoiceError('⚠️ No speech detected. Please speak louder or check your microphone.');
    }
  }

  startRecordingTimer() {
    this.updateRecordingTimer();
    this.recordingTimer = setInterval(() => this.updateRecordingTimer(), 1000);
  }

  stopRecordingTimer() {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  updateRecordingTimer() {
    const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    this.recordingTimerEl.textContent = `${minutes}:${seconds}`;
  }

  playRecording() {
    const textToSpeak = (this.transcription + this.interimTranscript).trim();
    if ('speechSynthesis' in window && textToSpeak) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  }

  retakeRecording() {
    this.resetVoiceSection();
  }

  showVoiceError(message) {
    this.voiceError.textContent = message;
    this.voiceError.classList.remove('hidden');
  }

  async submitText() {
    const text = this.textInput.value.trim();
    if (!text) {
      alert('Please enter some text');
      return;
    }
    
    this.showLoading();
    
    try {
      const response = await fetch(`${this.workerUrl}/api/fortune/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to get fortune');
      
      this.showResult(data.fortune);
    } catch (error) {
      this.showError(error.message);
    }
  }

  async submitVoice() {
    const text = (this.transcription + this.interimTranscript).trim();
    if (!text) {
      alert('No transcription available');
      return;
    }
    
    this.showLoading();
    
    try {
      const response = await fetch(`${this.workerUrl}/api/fortune/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to get fortune');
      
      this.showResult(data.fortune);
    } catch (error) {
      this.showError(error.message);
    }
  }

  showLoading() {
    this.textSection.classList.remove('active');
    this.voiceSection.classList.remove('active');
    this.resultSection.classList.add('hidden');
    this.errorSection.classList.add('hidden');
    this.loadingSection.classList.remove('hidden');
    
    // Change bubble text to random loading message
    if (this.catSpeechBubble) {
      this.catSpeechBubble.setAttribute('data-loading', 'true');
      const loadingMessages = [
        'Consulting the crystal ball<span class="loading-dots">...</span>',
        'Shuffling the tarot cards<span class="loading-dots">...</span>',
        'Reading the tea leaves<span class="loading-dots">...</span>',
        'Gazing into the void<span class="loading-dots">...</span>',
        'Waking up the spirits<span class="loading-dots">...</span>',
        'Polishing the crystal ball<span class="loading-dots">...</span>',
        'Channeling cosmic energy<span class="loading-dots">...</span>',
        'Asking the universe nicely<span class="loading-dots">...</span>'
      ];
      const randomLoadingMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
      this.catSpeechBubble.innerHTML = randomLoadingMessage;
    }
  }

  showResult(fortune) {
    this.loadingSection.classList.add('hidden');
    this.fortuneText.textContent = fortune;
    this.resultSection.classList.remove('hidden');
    this.animateFortuneText();
    
    // Show result message in bubble
    this.showResultBubbleText();
  }

  showResultBubbleText() {
    if (this.catSpeechBubble) {
      this.catSpeechBubble.removeAttribute('data-loading');
      const messages = [
        'Your destiny is revealed! ✨',
        'The future is clear! 🔮',
        'Magic has spoken! ⭐',
        'Your fortune awaits! 🌟'
      ];
      // Pick a random message
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      this.catSpeechBubble.innerHTML = randomMessage;
    }
  }

  animateFortuneText() {
    const text = this.fortuneText.textContent;
    this.fortuneText.textContent = '';
    let i = 0;
    const typeWriter = () => {
      if (i < text.length) {
        this.fortuneText.textContent += text.charAt(i);
        i++;
        setTimeout(typeWriter, 30);
      }
    };
    typeWriter();
  }

  showError(message) {
    this.loadingSection.classList.add('hidden');
    this.errorText.textContent = message;
    this.errorSection.classList.remove('hidden');
    
    // Restore bubble text based on current mode
    this.restoreBubbleText();
  }

  restoreBubbleText() {
    if (this.catSpeechBubble) {
      this.catSpeechBubble.removeAttribute('data-loading');
      const isVoiceMode = this.voiceModeBtn.classList.contains('active');
      if (isVoiceMode) {
        this.catSpeechBubble.innerHTML = 'Use Only <strong>English</strong> 🇬🇧 for voice please';
      } else {
        this.catSpeechBubble.innerHTML = 'For text any <strong>language</strong> is welcome';
      }
    }
  }

  reset() {
    this.textInput.value = '';
    this.resetVoiceSection();
    this.resultSection.classList.add('hidden');
    this.errorSection.classList.add('hidden');
    this.loadingSection.classList.add('hidden');
    this.switchMode('text');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FortuneTellerApp();
});