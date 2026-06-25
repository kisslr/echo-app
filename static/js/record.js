/**
 * 回声 - 录音相关逻辑
 */

var Recorder = {
  isRecording: false,
  mediaRecorder: null,
  audioChunks: [],
  stream: null,
  startTime: 0,
  timerInterval: null,
  duration: 0,
  maxDuration: 600,
  mimeType: 'audio/webm',
  fileExt: '.webm',
  audioContext: null,
  analyser: null,
  animFrame: null,
  currentVoiceId: null,
  currentBlob: null,
  pollInterval: null,

  /* 10 条话题 */
  topics: [
    '您小时候最喜欢吃什么？',
    '您年轻时最难忘的一件事是什么？',
    '您和另一半是怎么认识的？',
    '我们家族有什么特别的传承或故事？',
    '您这辈子最骄傲的一件事是什么？',
    '您最想留给后辈的一句话？',
    '还记得您教我的第一件事吗？',
    '您年轻时的梦想是什么？',
    '过年的时候您最期待什么？',
    '您觉得这一生最幸福的时刻是？'
  ],
  topicIndex: 0,

  onStateChange: null,
  onDurationUpdate: null,
  onRecordingComplete: null,

  init: function() {
    var self = this;
    var nameInput = DOM.el('#nameInput');
    var startBtn = DOM.el('#startRecordBtn');
    var recordBtn = DOM.el('#recordBtn');

    self._detectMimeType();

    // 从URL读取预选话题（来自发现页）
    var topicParam = getQueryParam('topic');
    if (topicParam && self.topics) {
      var idx = self.topics.indexOf(topicParam);
      if (idx !== -1) {
        self.topicIndex = idx;
      } else {
        // 自定义话题：插入到列表首位
        self.topics.unshift(topicParam);
        self.topicIndex = 0;
      }
    }

    // 自动填充上次使用的称呼
    if (nameInput) {
      var lastName = localStorage.getItem('last_voice_name');
      if (lastName) nameInput.value = lastName;
    }

    if (startBtn) {
      startBtn.addEventListener('click', function() {
        var name = nameInput ? nameInput.value.trim() : '';
        if (!name) {
          self._shake(nameInput);
          return;
        }
        localStorage.setItem('last_voice_name', name);
        Storage.set('currentPersonName', name);
        self._showRecordingUI(name);
      });
    }

    if (recordBtn) {
      recordBtn.addEventListener('click', function() {
        if (self.isRecording) {
          self.stop();
        } else {
          self.start();
        }
      });
    }

    self._bindTopicSwitcher();
    self._bindConfirmModal();
    self._bindBackButton();
    self._bindLeaveProtection();
    self._bindNativeFallback();
    self._bindGoChat();
  },

  _detectMimeType: function() {
    var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // iOS Safari 优先 mp4
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        this.mimeType = 'audio/mp4';
        this.fileExt = '.m4a';
        return;
      }
    }
    var types = [
      'audio/webm;codecs=opus',
      'audio/mp4',
      'audio/webm'
    ];
    for (var i = 0; i < types.length; i++) {
      if (MediaRecorder.isTypeSupported(types[i])) {
        this.mimeType = types[i];
        this.fileExt = types[i].indexOf('mp4') !== -1 ? '.m4a' : '.webm';
        return;
      }
    }
  },

  start: function() {
    var self = this;
    if (self.isRecording) return;

    var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    // iOS 需要在用户交互事件中提前创建 AudioContext
    if (isIOS && !self.audioContext) {
      try {
        self.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {}
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      self._showNativeFallback();
      return;
    }

    var constraints = { audio: { sampleRate: 16000, channelCount: 1 } };

    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
      self.stream = stream;
      self.mediaRecorder = new MediaRecorder(stream, { mimeType: self.mimeType });
      self.audioChunks = [];

      self.mediaRecorder.ondataavailable = function(e) {
        if (e.data.size > 0) {
          self.audioChunks.push(e.data);
        }
      };

      self.mediaRecorder.onstop = function() {
        self.currentBlob = new Blob(self.audioChunks, { type: self.mimeType });
        self._stopStream();
      };

      self.mediaRecorder.start(100);
      self.isRecording = true;
      self.duration = 0;
      self.startTime = Date.now();
      self._confirmShown = false;

      self._startWaveform();

      self.timerInterval = setInterval(function() {
        self.duration = Math.floor((Date.now() - self.startTime) / 1000);
        if (self.onDurationUpdate) {
          self.onDurationUpdate(self.duration);
        }
        if (self.duration >= self.maxDuration) {
          self.stop();
        }
      }, 200);

      if (self.onStateChange) {
        self.onStateChange(true);
      }
      self._updateRecordBtn(true);
    }).catch(function(err) {
      console.error('麦克风访问失败:', err);
      self._showNativeFallback();
    });
  },

  stop: function() {
    var self = this;
    if (!self.isRecording) return;

    self.isRecording = false;

    if (self.timerInterval) {
      clearInterval(self.timerInterval);
      self.timerInterval = null;
    }

    self._stopWaveform();

    if (self.mediaRecorder && self.mediaRecorder.state === 'recording') {
      self.mediaRecorder.stop();
    }

    if (self.onStateChange) {
      self.onStateChange(false);
    }
    self._updateRecordBtn(false);

    // 轮询等待 MediaRecorder 把 blob 准备好，然后弹确认窗
    self._waitForBlobAndConfirm();
  },

  _waitForBlobAndConfirm: function() {
    var self = this;
    var maxWait = 50;  // 最多等 5 秒
    var attempts = 0;

    function check() {
      attempts++;
      if (self.currentBlob) {
        self._showConfirmModal();
        return;
      }
      if (attempts < maxWait) {
        setTimeout(check, 100);
      } else {
        // 超时兜底：有 chunk 就直接拼一个 blob
        if (self.audioChunks && self.audioChunks.length > 0) {
          self.currentBlob = new Blob(self.audioChunks, { type: self.mimeType });
        }
        self._showConfirmModal();
      }
    }
    check();
  },

  _startWaveform: function() {
    var self = this;
    try {
      if (!self.audioContext || self.audioContext.state === 'closed') {
        self.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      // iOS容错：切后台/锁屏后 AudioContext 会被系统挂起，强制恢复
      if (self.audioContext.state === 'suspended') {
        self.audioContext.resume().catch(function(){});
      }
      self.analyser = self.audioContext.createAnalyser();
      self.analyser.fftSize = 256;

      var source = self.audioContext.createMediaStreamSource(self.stream);
      source.connect(self.analyser);

      var bars = DOM.all('#waveformBars .wf-bar');
      var container = DOM.el('#circleContainer');

      function draw() {
        if (!self.analyser) return;
        var dataArray = new Uint8Array(self.analyser.frequencyBinCount);
        self.analyser.getByteFrequencyData(dataArray);

        if (bars.length > 0) {
          var step = Math.floor(dataArray.length / bars.length);
          for (var i = 0; i < bars.length; i++) {
            var val = dataArray[i * step] / 255;
            var h = Math.max(4, val * 40);
            bars[i].style.height = h + 'px';
          }
        }

        var sum = 0;
        for (var j = 0; j < dataArray.length; j++) {
          sum += dataArray[j];
        }
        var avg = sum / dataArray.length / 255;
        var scale = 1 + avg * 0.15;
        if (container) {
          container.style.transform = 'scale(' + scale + ')';
        }

        self.animFrame = requestAnimationFrame(draw);
      }
      draw();
    } catch (e) {
      console.log('AudioContext not available');
    }
  },

  _stopWaveform: function() {
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(function() {});
      this.audioContext = null;
    }
    this.analyser = null;
    var container = DOM.el('#circleContainer');
    if (container) container.style.transform = 'scale(1)';
  },

  _showNativeFallback: function() {
    var recordSection = DOM.el('#recordSection');
    if (!recordSection) return;

    // 隐藏称呼输入区
    var nameSection = DOM.el('#state-nameInput');
    if (nameSection) nameSection.style.display = 'none';

    var name = Storage.get('currentPersonName') || '';
    recordSection.style.display = 'block';
    var nameDisplay = DOM.el('#displayName');
    if (nameDisplay) nameDisplay.textContent = name || '录制';

    var hero = DOM.el('#recordHero');
    if (hero) hero.style.display = 'none';

    var topicSection = DOM.el('#topicSection');
    if (topicSection) topicSection.style.display = 'none';

    var fallback = DOM.el('#nativeRecorderFallback');
    if (fallback) fallback.style.display = 'block';
  },

  _bindTopicSwitcher: function() {
    var self = this;
    var topicText = DOM.el('#topicText');
    var topicNext = DOM.el('#topicNext');

    if (topicText) {
      topicText.textContent = self.topics[0];
    }

    if (topicNext) {
      topicNext.addEventListener('click', function(e) {
        e.stopPropagation();
        self.topicIndex = (self.topicIndex + 1) % self.topics.length;
        var el = DOM.el('#topicText');
        if (el) {
          el.style.opacity = '0';
          setTimeout(function() {
            el.textContent = self.topics[self.topicIndex];
            el.style.opacity = '1';
          }, 150);
        }
      });
    }

    // 点击话题卡片 → 开始录音
    var topicCard = DOM.el('#topicCard');
    if (topicCard) {
      topicCard.addEventListener('click', function() {
        if (!self.isRecording) self.start();
      });
    }
  },

  _bindBackButton: function() {
    var backBtn = DOM.el('#recordBackBtn');
    if (backBtn) {
      var self = this;
      backBtn.addEventListener('click', function(e) {
        if (self.isRecording) {
          e.preventDefault();
          if (!confirm('录制内容将丢失，确定离开吗？')) {
            return;
          }
          self.stop();
        }
        window.location.href = '/';
      });
    }
  },

  _bindConfirmModal: function() {
    var self = this;
    var modal = DOM.el('#confirmModal');
    var btnRetry = DOM.el('#btnRetry');
    var btnSave = DOM.el('#btnSave');

    if (btnRetry) {
      btnRetry.addEventListener('click', function() {
        if (modal) modal.style.display = 'none';
        var recordSection = DOM.el('#recordSection');
        if (recordSection) recordSection.style.display = 'block';
        var hero = DOM.el('#recordHero');
        if (hero) hero.style.display = 'block';
        var topicSection = DOM.el('#topicSection');
        if (topicSection) topicSection.style.display = 'block';
        self.start();
      });
    }

    if (btnSave) {
      btnSave.addEventListener('click', function() {
        if (modal) modal.style.display = 'none';
        self._uploadFlow();
      });
    }
  },

  _bindLeaveProtection: function() {
    var self = this;
    window.addEventListener('beforeunload', function(e) {
      if (self.isRecording) {
        e.preventDefault();
        e.returnValue = '录制内容将丢失，确定离开吗？';
        return e.returnValue;
      }
    });
  },

  _bindNativeFallback: function() {
    var self = this;
    var nativeInput = DOM.el('#nativeRecorder');
    if (nativeInput) {
      nativeInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        self.currentBlob = file;
        self.duration = Math.floor(file.size / 16000);
        self._showConfirmModal();
      });
    }
  },

  _bindGoChat: function() {
    var self = this;
    var btnGoChat = DOM.el('#btnGoChat');
    if (btnGoChat) {
      btnGoChat.addEventListener('click', function(e) {
        e.preventDefault();
        var voiceId = self.currentVoiceId;
        var name = Storage.get('currentPersonName') || '';
        if (voiceId) {
          window.location.href = '/chat?voice_id=' + voiceId + '&name=' + encodeURIComponent(name);
        }
      });
    }
  },

  _showConfirmModal: function() {
    var modal = DOM.el('#confirmModal');
    var durText = DOM.el('#confirmDuration');
    if (durText) {
      durText.textContent = '已录制 ' + TimeUtils.formatDuration(this.duration) + '，确定保存吗？';
    }
    if (modal) modal.style.display = 'flex';
  },

  _uploadFlow: function() {
    var self = this;
    var name = Storage.get('currentPersonName') || '未知';
    var blob = self.currentBlob;

    self._setUIState('uploading');

    fetch('/api/voices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name })
    }).then(function(resp) { return resp.json(); })
    .then(function(data) {
      if (!data.success) throw new Error(data.error);
      self.currentVoiceId = data.voice.id;
      saveVoiceLocally({ id: data.voice.id, name: name, avatar_emoji: data.voice.avatar_emoji, created_at: data.voice.created_at });

      var formData = new FormData();
      formData.append('audio_file', blob, 'sample' + self.fileExt);

      return fetch('/api/voices/' + self.currentVoiceId + '/upload', {
        method: 'POST',
        body: formData
      }).then(function(resp) { return resp.json(); });
    }).then(function(data) {
      if (!data.success) throw new Error(data.error);
      self._setUIState('training');
      self._pollModelStatus(self.currentVoiceId);
    }).catch(function(err) {
      console.error('上传失败:', err);
      if (typeof showToast === 'function') {
        showToast('上传失败，请检查网络', 'error');
      } else {
        alert('上传失败，请检查网络');
      }
      self._setUIState('confirm');
      self._showConfirmModal();
    });
  },

  _pollModelStatus: function(voiceId) {
    var self = this;
    if (self.pollInterval) clearInterval(self.pollInterval);

    var attempts = 0;
    var maxAttempts = 20;

    self.pollInterval = setInterval(function() {
      attempts++;
      fetch('/api/voices/' + voiceId + '/model-status')
        .then(function(r) {
          // 404 → 声音被删除，立即停止轮询并跳转
          if (r.status === 404) {
            clearInterval(self.pollInterval);
            self.pollInterval = null;
            if (typeof showToast === 'function') {
              showToast('声音档案已被删除', 'error');
            }
            setTimeout(function() { window.location.href = '/'; }, 1500);
            return null;
          }
          return r.json();
        })
        .then(function(data) {
          if (!data) return;  // 404 已处理
          if (!data.success) return;

          var progressEl = DOM.el('#trainingProgressFill');
          if (progressEl) {
            progressEl.style.width = data.progress + '%';
          }
          var progressText = DOM.el('#trainingProgressText');
          if (progressText) {
            progressText.textContent = data.progress + '%';
          }

          if (data.status === 'ready' || attempts >= maxAttempts) {
            clearInterval(self.pollInterval);
            self.pollInterval = null;
            self._setUIState('ready');
          }
        })
        .catch(function() {
          if (attempts >= maxAttempts) {
            clearInterval(self.pollInterval);
            self.pollInterval = null;
            self._setUIState('ready');
          }
        });
    }, 3000);
  },

  _setUIState: function(state) {
    // 隐藏所有状态区
    var ids = ['#state-nameInput', '#recordSection', '#confirmModal',
               '#state-uploading', '#state-training', '#state-ready'];
    ids.forEach(function(id) {
      var el = DOM.el(id);
      if (el) el.style.display = 'none';
    });

    // 显示目标
    var targetMap = {
      'nameInput': '#state-nameInput',
      'recording': '#recordSection',
      'confirm': '#confirmModal',
      'uploading': '#state-uploading',
      'training': '#state-training',
      'ready': '#state-ready'
    };
    var target = DOM.el(targetMap[state]);
    if (target) {
      target.style.display = (state === 'confirm') ? 'flex' : 'block';
    }

    if (state === 'ready') {
      var readyName = DOM.el('#readyVoiceName');
      if (readyName) readyName.textContent = Storage.get('currentPersonName') || '';
    }
  },

  _updateRecordBtn: function(recording) {
    var btn = DOM.el('#recordBtn');
    if (!btn) return;
    if (recording) {
      btn.classList.add('is-recording');
    } else {
      btn.classList.remove('is-recording');
    }
  },

  _showRecordingUI: function(name) {
    var nameSection = DOM.el('#state-nameInput');
    var recordSection = DOM.el('#recordSection');
    var displayName = DOM.el('#displayName');

    if (nameSection) nameSection.style.display = 'none';
    if (recordSection) {
      recordSection.style.display = 'block';
      // 显示声波区、话题区
      var hero = DOM.el('#recordHero');
      if (hero) hero.style.display = 'block';
      var topicSection = DOM.el('#topicSection');
      if (topicSection) topicSection.style.display = 'block';
    }
    if (displayName) displayName.textContent = name;

    var fb = DOM.el('#nativeRecorderFallback');
    if (fb) fb.style.display = 'none';
  },

  _shake: function(el) {
    if (!el) return;
    el.style.borderColor = '#C75B5B';
    el.style.animation = 'shake 0.4s ease';
    setTimeout(function() {
      el.style.borderColor = '';
      el.style.animation = '';
    }, 400);
  }
};

/* ========== 页面初始化 ========== */
document.addEventListener('DOMContentLoaded', function() {
  Recorder.init();
});
