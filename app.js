// Fortune Teller App - Frontend Logic
class FortuneTellerApp {
  constructor() {
    // Force correct worker URL (cache buster v2)
    this.workerUrl = window.CONFIG?.WORKER_URL || "https://fortune-teller-worker.vadimfrolovde.workers.dev";
    console.log("Using Worker URL:", this.workerUrl); // Debug log
    this.recognition = null;
    this.transcription = '';
    this.interimTranscript = '';
    this.isRecording = false;
    this.hasRecordingStarted = false;
    this.recordingStartTime = null;
    this.recordingTimer = null;
    
    // Council state
    this.councilData = null;
    this.currentAgentIndex = 0;
    this.isRevealing = false;
    this.originalQuestion = ''; // Store the original question for action plan
    
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
    
    // Council elements
    this.councilSection = document.getElementById('councilSection');
    this.councilCards = document.getElementById('councilCards');
    this.councilProgress = document.getElementById('councilProgress');
    this.showAllBtn = document.getElementById('showAllBtn');
    this.newCouncilFortuneBtn = document.getElementById('newCouncilFortuneBtn');
    
    // Action plan elements
    this.actionPlanSection = document.getElementById('actionPlanSection');
    this.actionGoalInput = document.getElementById('actionGoalInput');
    this.createActionPlanBtn = document.getElementById('createActionPlanBtn');
    this.skipActionPlanBtn = document.getElementById('skipActionPlanBtn');
    this.actionPlanResult = document.getElementById('actionPlanResult');
    this.actionPlanContent = document.getElementById('actionPlanContent');
    this.newActionFortuneBtn = document.getElementById('newActionFortuneBtn');
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
    
    // Council event listeners
    this.showAllBtn.addEventListener('click', () => this.showAllAgents());
    this.newCouncilFortuneBtn.addEventListener('click', () => this.reset());
    
    // Action plan event listeners
    this.createActionPlanBtn.addEventListener('click', () => this.createActionPlan());
    this.skipActionPlanBtn.addEventListener('click', () => this.reset());
    this.newActionFortuneBtn.addEventListener('click', () => this.reset());
    
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
    
    this.actionGoalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.createActionPlan();
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
    
    this.originalQuestion = text; // Store the original question
    this.showLoading();
    
    try {
      // Use council endpoint for chained agent responses
      const response = await fetch(`${this.workerUrl}/api/fortune/council`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to get fortune');
      
      // Show council results instead of single result
      this.showCouncilResult(data.council);
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
    
    this.originalQuestion = text; // Store the original question
    this.showLoading();
    
    try {
      // Use council endpoint for chained agent responses
      const response = await fetch(`${this.workerUrl}/api/fortune/council`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to get fortune');
      
      // Show council results instead of single result
      this.showCouncilResult(data.council);
    } catch (error) {
      this.showError(error.message);
    }
  }

  showLoading() {
    this.textSection.classList.remove('active');
    this.voiceSection.classList.remove('active');
    this.resultSection.classList.add('hidden');
    this.councilSection.classList.add('hidden');
    this.errorSection.classList.add('hidden');
    this.loadingSection.classList.remove('hidden');
    
    // Change bubble text to council-specific loading message
    if (this.catSpeechBubble) {
      this.catSpeechBubble.setAttribute('data-loading', 'true');
      const loadingMessages = [
        'Gathering the Council<span class="loading-dots">...</span>',
        'Summoning the Fortune Council<span class="loading-dots">...</span>',
        'The Council is assembling<span class="loading-dots">...</span>',
        'Consulting the wise ones<span class="loading-dots">...</span>',
        'Calling upon the mystical council<span class="loading-dots">...</span>',
        'The agents are gathering<span class="loading-dots">...</span>',
        'Preparing the Council of Fate<span class="loading-dots">...</span>',
        'Channeling multiple visions<span class="loading-dots">...</span>'
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

  // Council methods
  showCouncilResult(council) {
    console.log('showCouncilResult called with:', council);
    
    if (!council || !Array.isArray(council) || council.length === 0) {
      console.error('Invalid council data:', council);
      this.showError('Error: Invalid response from server');
      return;
    }
    
    this.councilData = council;
    this.currentAgentIndex = 0;
    this.isRevealing = false;
    
    console.log('Council data set:', this.councilData);
    console.log('Council section element:', this.councilSection);
    console.log('Council cards element:', this.councilCards);
    
    this.loadingSection.classList.add('hidden');
    this.councilSection.classList.remove('hidden');
    this.councilCards.innerHTML = '';
    
    // Reset buttons
    this.showAllBtn.classList.remove('hidden');
    this.newCouncilFortuneBtn.classList.add('hidden');
    
    // Update progress
    this.updateCouncilProgress();
    
    // Show result message in bubble
    this.showResultBubbleText();
    
    // Automatically reveal first agent after a short delay to ensure DOM is ready
    console.log('About to reveal first agent...');
    setTimeout(() => {
      this.revealNextAgent();
    }, 100);
  }

  updateCouncilProgress() {
    if (this.currentAgentIndex < this.councilData.length) {
      this.councilProgress.textContent = `Council Member ${this.currentAgentIndex + 1} of ${this.councilData.length} speaks...`;
    } else {
      this.councilProgress.textContent = '✨ The Council has spoken ✨';
    }
  }

  async revealNextAgent() {
    if (this.isRevealing || this.currentAgentIndex >= this.councilData.length) {
      console.log('Skipping reveal - already revealing or finished');
      return;
    }
    
    console.log(`Revealing agent ${this.currentAgentIndex + 1} of ${this.councilData.length}`);
    this.isRevealing = true;
    const agent = this.councilData[this.currentAgentIndex];
    
    // Create card for this agent
    const card = this.createCouncilCard(agent, this.currentAgentIndex);
    console.log('Created card:', card);
    this.councilCards.appendChild(card);
    console.log('Appended card to councilCards');
    
    // Animate card appearance - force reflow then add visible class
    void card.offsetHeight; // Force reflow
    requestAnimationFrame(() => {
      card.classList.add('visible');
      console.log('Card classes after animation:', card.className);
    });
    
    // Type out the response
    const textElement = card.querySelector('.council-response');
    console.log('Text element:', textElement);
    await this.typeWriter(textElement, agent.response);
    
    this.currentAgentIndex++;
    this.isRevealing = false;
    
    // Update progress
    this.updateCouncilProgress();
    
    // Check if all agents revealed
    if (this.currentAgentIndex >= this.councilData.length) {
      this.showAllBtn.classList.add('hidden');
      this.newCouncilFortuneBtn.classList.add('hidden'); // Hide the "Ask Again" button
      
      // Show completion message in bubble
      if (this.catSpeechBubble) {
        this.catSpeechBubble.innerHTML = 'The Council has spoken! Now, what do you really want? 🐱✨';
      }
      
      // Show action plan section after a short delay
      setTimeout(() => {
        this.showActionPlanPrompt();
      }, 1000);
    } else {
      // Automatically reveal next agent after a short delay
      setTimeout(() => {
        this.revealNextAgent();
      }, 800);
    }
  }

  showAllAgents() {
    // Reveal all remaining agents at once
    while (this.currentAgentIndex < this.councilData.length) {
      const agent = this.councilData[this.currentAgentIndex];
      const card = this.createCouncilCard(agent, this.currentAgentIndex);
      this.councilCards.appendChild(card);
      
      // Show full text immediately (no typewriter)
      const textElement = card.querySelector('.council-response');
      textElement.textContent = agent.response;
      
      // Make visible immediately
      card.classList.add('visible');
      this.currentAgentIndex++;
    }
    
    this.updateCouncilProgress();
    this.showAllBtn.classList.add('hidden');
    this.newCouncilFortuneBtn.classList.add('hidden'); // Hide the "Ask Again" button
    
    // Show action plan section after revealing all agents
    setTimeout(() => {
      this.showActionPlanPrompt();
    }, 500);
  }

  createCouncilCard(agent, index) {
    const card = document.createElement('div');
    card.className = `council-card council-card-${agent.color}`;
    
    card.innerHTML = `
      <div class="council-card-header">
        <span class="council-emoji">${agent.emoji}</span>
        <div class="council-info">
          <h3 class="council-name">${agent.name}</h3>
          <span class="council-number">#${index + 1}</span>
        </div>
      </div>
      <p class="council-response"></p>
    `;
    
    return card;
  }

  typeWriter(element, text) {
    return new Promise((resolve) => {
      if (!element || !text) {
        console.log('TypeWriter: missing element or text', { element, text });
        resolve();
        return;
      }
      
      element.textContent = '';
      let i = 0;
      const speed = 25; // ms per character
      
      const type = () => {
        if (i < text.length) {
          element.textContent += text.charAt(i);
          i++;
          setTimeout(type, speed);
        } else {
          resolve();
        }
      };
      
      type();
    });
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
  // Action Plan Methods
  showActionPlanPrompt() {
    // Show the action plan section
    this.actionPlanSection.classList.remove('hidden');
    this.actionGoalInput.value = '';
    this.actionPlanResult.classList.add('hidden');
    
    // Scroll to action plan section
    this.actionPlanSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async createActionPlan() {
    const userGoal = this.actionGoalInput.value.trim();
    
    if (!userGoal) {
      alert('Please tell us what you really want to achieve');
      return;
    }
    
    // Show loading state
    this.createActionPlanBtn.disabled = true;
    this.createActionPlanBtn.textContent = 'Creating Your Plan... ✨';
    
    try {
      const response = await fetch(`${this.workerUrl}/api/fortune/action-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalQuestion: this.originalQuestion,
          userGoal: userGoal
        }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create action plan');
      
      // Show the action plan result
      this.showActionPlanResult(data.actionPlan);
    } catch (error) {
      alert('Error creating action plan: ' + error.message);
      this.createActionPlanBtn.disabled = false;
      this.createActionPlanBtn.textContent = 'Create My Action Plan ✨';
    }
  }

  showActionPlanResult(actionPlan) {
    // Hide the prompt, show the result
    this.actionPlanResult.classList.remove('hidden');
    this.actionPlanContent.textContent = actionPlan;
    
    // Hide the input section
    document.querySelector('.action-plan-prompt').style.display = 'none';
    
    // Update cat bubble
    if (this.catSpeechBubble) {
      this.catSpeechBubble.innerHTML = 'Your path is clear! Now go make it happen! 🐱🎯';
    }
    
    // Scroll to result
    this.actionPlanResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    this.councilSection.classList.add('hidden');
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
    this.councilSection.classList.add('hidden');
    this.actionPlanSection.classList.add('hidden');
    
    // Reset council state
    this.councilData = null;
    this.currentAgentIndex = 0;
    this.isRevealing = false;
    this.originalQuestion = '';
    
    // Reset action plan state
    this.actionGoalInput.value = '';
    this.actionPlanResult.classList.add('hidden');
    this.createActionPlanBtn.disabled = false;
    this.createActionPlanBtn.textContent = 'Create My Action Plan ✨';
    const promptSection = document.querySelector('.action-plan-prompt');
    if (promptSection) {
      promptSection.style.display = '';
    }
    
    this.switchMode('text');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FortuneTellerApp();
});