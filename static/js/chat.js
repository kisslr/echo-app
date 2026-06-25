/**
 * 回声 - 对话相关逻辑
 */

var Chat = {
  messages: [],
  voiceId: null,
  voiceName: '',
  voiceRecorder: null,
  voiceChunks: [],
  isVoiceRecording: false,
  voiceRecordTimer: null,
  voiceRecordSeconds: 0,

  init: function() {
    var self = this;

    var params = new URLSearchParams(window.location.search);
    self.voiceId = params.get('voice_id');
    self.voiceName = params.get('name') || '长辈';

    if (!self.voiceId) {
      if (typeof showToast === 'function') {
        showToast('请先选择声音档案', 'error');
      }
      setTimeout(function() { location.href = '/'; }, 2000);
      return;
    }

    Storage.set('currentVoiceId', self.voiceId);
    Storage.set('currentPersonName', self.voiceName);

    var sendBtn = DOM.el('#sendBtn');
    var msgInput = DOM.el('#messageInput');
    var voiceBtn = DOM.el('#voiceBtn');

    self._updateHeader();
    self._loadHistory();

    if (msgInput) {
      msgInput.addEventListener('input', function() {
        self._updateSendBtn();
      });
      msgInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          self.sendMessage();
        }
      });
    }
    self._updateSendBtn();

    if (sendBtn) {
      sendBtn.addEventListener('click', function() {
        self.sendMessage();
      });
    }

    if (voiceBtn) {
      voiceBtn.addEventListener('mousedown', function(e) { e.preventDefault(); self._startVoiceRecord(); });
      voiceBtn.addEventListener('touchstart', function(e) { e.preventDefault(); self._startVoiceRecord(); });
      voiceBtn.addEventListener('mouseup', function() { self._stopVoiceRecord(); });
      voiceBtn.addEventListener('touchend', function(e) { e.preventDefault(); self._stopVoiceRecord(); });
      voiceBtn.addEventListener('mouseleave', function() { self._stopVoiceRecord(); });
    }

    self._bindTopics();
  },

  sendMessage: function(text, isVoice, audioBlob) {
    var self = this;
    var input = DOM.el('#messageInput');

    if (!text && input) {
      text = input.value.trim();
    }
    if (!text && !isVoice) return;

    var displayText = isVoice ? '🎤 语音消息' : text;

    self._appendMessage('user', displayText, isVoice ? 'voice' : 'text');
    if (input) { input.value = ''; }
    self._updateSendBtn();
    self._showTyping();

    var history = self.getRecentHistory(10);

    self._callChatAPI(text || '语音消息', history).then(function(reply) {
      self._hideTyping();
      self._appendMessage('assistant', reply.content, 'text', reply.audio_url);
    }).catch(function() {
      self._hideTyping();
      self._appendMessage('assistant', self._mockReply(text || '').content, 'text', null);
    });
  },

  _appendMessage: function(role, content, type, audioUrl) {
    var self = this;
    var container = DOM.el('#chatMessages');
    if (!container) return;

    var now = new Date();
    var timeStr = self._formatMessageTime(now);
    var lastMsg = self.messages[self.messages.length - 1];

    // Hide topic area on first message
    self._hideTopics();

    // Date separator
    if (lastMsg) {
      var lastDate = new Date(lastMsg.created_at);
      if (lastDate.toDateString() !== now.toDateString()) {
        var days = ['日', '一', '二', '三', '四', '五', '六'];
        var sep = document.createElement('div');
        sep.style.cssText = 'text-align:center; margin:16px 0; color:#999; font-size:13px';
        sep.textContent = '── ' + (now.getMonth() + 1) + '月' + now.getDate() + '日 星期' + days[now.getDay()] + ' ──';
        container.appendChild(sep);
      }
    }

    var avatarEmoji = self._getAvatar();

    if (role === 'assistant') {
      // 长辈消息 — 左对齐
      var wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:flex; align-items:flex-start; margin-bottom:16px';

      var avatar = document.createElement('div');
      avatar.style.cssText = 'width:36px;height:36px;border-radius:50%;background:#EEE;text-align:center;line-height:36px;font-size:18px;flex-shrink:0';
      avatar.textContent = avatarEmoji;
      wrapper.appendChild(avatar);

      var body = document.createElement('div');
      body.style.cssText = 'margin-left:8px; max-width:70%';

      var bubble = document.createElement('div');
      bubble.style.cssText = 'background:#fff; border-radius:4px 12px 12px 12px; padding:10px 14px; font-size:15px; color:#3C2415; box-shadow:0 1px 3px rgba(0,0,0,0.06); line-height:1.5; word-break:break-word';
      bubble.textContent = content;
      body.appendChild(bubble);

      if (audioUrl) {
        var playBtn = document.createElement('button');
        playBtn.style.cssText = 'display:inline-flex; align-items:center; gap:4px; font-size:12px; color:#E8943A; padding:4px 0; margin-top:4px; cursor:pointer; background:none; border:none';
        playBtn.textContent = '▶ 播放';
        playBtn.addEventListener('click', function() {
          self._playAudio(audioUrl, playBtn);
        });
        body.appendChild(playBtn);
      }

      var timeLabel = document.createElement('div');
      timeLabel.style.cssText = 'margin-top:4px; font-size:12px; color:#999';
      timeLabel.textContent = timeStr;
      body.appendChild(timeLabel);

      wrapper.appendChild(body);
      container.appendChild(wrapper);
    } else {
      // 用户消息 — 右对齐
      var wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:flex; flex-direction:row-reverse; align-items:flex-start; margin-bottom:16px';

      var body = document.createElement('div');
      body.style.cssText = 'max-width:70%';

      var bubble = document.createElement('div');
      bubble.style.cssText = 'background:#E8943A; border-radius:12px 4px 12px 12px; padding:10px 14px; font-size:15px; color:#fff; line-height:1.5; word-break:break-word';
      bubble.textContent = content;
      body.appendChild(bubble);

      var timeLabel = document.createElement('div');
      timeLabel.style.cssText = 'margin-top:4px; font-size:12px; color:#999; text-align:right';
      timeLabel.textContent = timeStr;
      body.appendChild(timeLabel);

      wrapper.appendChild(body);
      container.appendChild(wrapper);
    }

    self._scrollToBottom();

    self.messages.push({
      role: role,
      content: content,
      type: type,
      audio_url: audioUrl || null,
      created_at: now.toISOString()
    });
    self._saveHistory();
  },

  _showTyping: function() {
    var container = DOM.el('#chatMessages');
    if (!container) return;

    this._hideTyping();

    var typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.id = 'typingIndicator';
    typing.style.cssText = 'display:flex; align-items:center; gap:4px; padding:10px 14px; background:#fff; border-radius:4px 12px 12px 12px; align-self:flex-start; box-shadow:0 1px 3px rgba(0,0,0,0.06); margin-bottom:16px;';

    for (var i = 0; i < 3; i++) {
      var dot = document.createElement('div');
      dot.className = 'typing-dot';
      dot.style.cssText = 'width:7px; height:7px; border-radius:50%; background:#C4B8AD; animation: typingBounce 1.2s ease-in-out infinite; animation-delay:' + (i * 0.2) + 's';
      typing.appendChild(dot);
    }

    container.appendChild(typing);
    this._scrollToBottom();
  },

  _hideTyping: function() {
    var typing = DOM.el('#typingIndicator');
    if (typing) typing.remove();
  },

  // v3.6 端云协同：检测端侧路径是否可用
  _isOnDeviceAvailable: function() {
    return !!(window.BlueLM && window.BlueLM.isNative && window.BlueLM.isNative());
  },

  // 判断消息是否适合端侧处理（简单问候/日常关心 → 端侧3B；故事/情感 → 云端70B）
  _shouldUseOnDevice: function(message) {
    var complexPatterns = ['故事', '讲', '以前', '小时候', '回忆', '年轻', '梦想',
                           '为什么', '怎么', '什么原因', '感觉', '心里', '难过', '讲讲'];
    for (var i = 0; i < complexPatterns.length; i++) {
      if (message.indexOf(complexPatterns[i]) !== -1) return false; // 复杂 → 云端
    }
    return true; // 简单 → 端侧
  },

  // 端侧推理（Android WebView + BlueLM 3B NPU）
  _callOnDevice: function(message) {
    var self = this;
    return new Promise(function(resolve, reject) {
      // 守卫1：环境检测 — 非APK环境直接拒绝，触发云端降级
      if (typeof window.BlueLM === 'undefined' || typeof window.BlueLM.chat !== 'function') {
        return reject(new Error('Not in APK environment'));
      }

      var fullReply = '';
      var isResolved = false;

      // 守卫2：超时熔断 — 5秒无响应强制降级到云端
      var timeoutId = setTimeout(function() {
        if (!isResolved) {
          isResolved = true;
          reject(new Error('On-device inference timeout'));
        }
      }, 5000);

      try {
        window.BlueLM.chat(message, function(result) {
          if (isResolved) return;
          if (result.error) {
            isResolved = true;
            clearTimeout(timeoutId);
            reject(new Error(result.error));
          } else if (result.done) {
            isResolved = true;
            clearTimeout(timeoutId);
            resolve({ content: fullReply, audio_url: null, model_used: 'bluelm-3b-ondevice' });
          } else if (result.token) {
            fullReply += result.token;
          }
        });
      } catch (e) {
        // 守卫3：同步异常捕获
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          reject(e);
        }
      }
    });
  },

  _callChatAPI: function(message, history) {
    var self = this;

    // 端侧优先：检测 Android Bridge + 消息适合端侧处理
    if (self._isOnDeviceAvailable() && self._shouldUseOnDevice(message)) {
      return self._callOnDevice(message).catch(function() {
        // 端侧失败 → 静默降级到云端
        console.log('端侧推理失败，降级到云端API');
        return self._callCloudAPI(message, history);
      });
    }

    // 默认云端路径
    return self._callCloudAPI(message, history);
  },

  // 云端路径（Flask → BlueLM 70B API）
  _callCloudAPI: function(message, history) {
    var self = this;
    return fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_id: self.voiceId, message: message, history: history, route: 'cloud' })
    }).then(function(resp) { return resp.json(); })
    .then(function(data) {
      if (data.success && data.reply) return data.reply;
      throw new Error('API error');
    });
  },

  _mockReply: function(userMsg) {
    var name = this.voiceName || '长辈';
    var reply;
    if (/吃|饿|饭/.test(userMsg)) reply = name + '说：你要好好吃饭啊，别老吃外卖，那东西不健康。';
    else if (/想|念/.test(userMsg)) reply = name + '说：我也想你啊孩子，有空回来看看。';
    else if (/累|忙|压力/.test(userMsg)) reply = name + '说：工作别太拼了，身体要紧。累了就歇歇。';
    else if (/故事|讲|以前|小时候/.test(userMsg)) reply = name + '说：我给你讲个你小时候的事啊，有一次你在院子里追蝴蝶，摔了一跤也没哭，爬起来继续追。';
    else reply = name + '说：今天天气不错，在外面要照顾好自己。';
    return { content: reply, audio_url: null };
  },

  _playAudio: function(url, btn) {
    var self = this;
    if (!url) {
      // 没有音频文件 → 使用浏览器内置TTS朗读
      self._speakWithBrowserTTS(btn);
      return;
    }
    var audio = new Audio(url);
    if (btn) btn.textContent = '⏸';
    audio.play().then(function() {
      audio.onended = function() { if (btn) btn.textContent = '▶ 播放'; };
    }).catch(function() {
      // 音频播放失败 → 降级到浏览器内置TTS
      if (btn) btn.textContent = '▶ 播放';
      self._speakWithBrowserTTS(btn);
    });
    audio.onerror = function() {
      if (btn) btn.textContent = '▶ 播放';
      self._speakWithBrowserTTS(btn);
    };
  },

  // 浏览器内置语音合成 (Web Speech API) — 离线可用, 系统自带中文语音
  _speakWithBrowserTTS: function(btn) {
    if (!window.speechSynthesis) return;
    // 获取最后一条assistant消息的内容
    var lastMsg = null;
    for (var i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'assistant') { lastMsg = this.messages[i]; break; }
    }
    if (!lastMsg) return;

    var utterance = new SpeechSynthesisUtterance(lastMsg.content);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.85;   // 语速稍慢，模拟老人
    utterance.pitch = 0.95;  // 音调稍低

    if (btn) btn.textContent = '⏸';
    utterance.onend = function() { if (btn) btn.textContent = '▶ 播放'; };
    utterance.onerror = function() { if (btn) btn.textContent = '▶ 播放'; };
    window.speechSynthesis.speak(utterance);
  },

  _startVoiceRecord: function() {
    var self = this;
    if (self.isVoiceRecording) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (typeof showToast === 'function') showToast('当前环境不支持录音，请使用文本输入', 'error');
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
      var mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/mp4';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/webm';

      self.voiceRecorder = new MediaRecorder(stream, { mimeType: mimeType });
      self.voiceChunks = [];
      self.voiceRecordSeconds = 0;

      self.voiceRecorder.ondataavailable = function(e) {
        if (e.data.size > 0) self.voiceChunks.push(e.data);
      };

      self.voiceRecorder.onstop = function() {
        stream.getTracks().forEach(function(t) { t.stop(); });
        if (self.voiceChunks.length > 0) {
          self.sendMessage('', true, new Blob(self.voiceChunks, { type: mimeType }));
        }
      };

      self.voiceRecorder.start(100);
      self.isVoiceRecording = true;

      var voiceBtn = DOM.el('#voiceBtn');
      if (voiceBtn) voiceBtn.style.background = '#E85D3A';

      // 60s 自动停止
      self.voiceRecordTimer = setInterval(function() {
        self.voiceRecordSeconds++;
        if (self.voiceRecordSeconds >= 60) self._stopVoiceRecord();
      }, 1000);
    }).catch(function() {
      if (typeof showToast === 'function') showToast('无法访问麦克风', 'error');
    });
  },

  _stopVoiceRecord: function() {
    var self = this;
    if (!self.isVoiceRecording) return;

    self.isVoiceRecording = false;
    if (self.voiceRecordTimer) { clearInterval(self.voiceRecordTimer); self.voiceRecordTimer = null; }

    if (self.voiceRecorder && self.voiceRecorder.state === 'recording') {
      self.voiceRecorder.stop();
    }

    var voiceBtn = DOM.el('#voiceBtn');
    if (voiceBtn) voiceBtn.style.background = '';
  },

  _updateHeader: function() {
    var nameEl = DOM.el('#chatPersonName');
    var avatarEl = DOM.el('#chatAvatar');
    var subtitleEl = DOM.el('#chatSubtitle');

    if (nameEl) nameEl.textContent = this.voiceName;
    if (avatarEl) avatarEl.textContent = this._getAvatar();
    if (subtitleEl) {
      var key = 'chat_history_' + this.voiceId;
      var history = JSON.parse(localStorage.getItem(key) || '[]');
      if (history.length > 0) {
        var last = new Date(history[history.length - 1].created_at);
        subtitleEl.textContent = 'AI声音模型 · 上次对话：' + TimeUtils.daysAgo(last.toISOString());
      } else {
        subtitleEl.textContent = 'AI声音模型 · 首次对话';
      }
    }
  },

  _bindTopics: function() {
    var self = this;
    var chips = document.querySelectorAll('#topicChips .topic-chip');
    chips.forEach(function(chip) {
      chip.addEventListener('click', function() {
        var text = this.textContent.trim();
        var input = DOM.el('#messageInput');
        if (input) input.value = text;
        self.sendMessage();
      });
    });
  },

  _hideTopics: function() {
    var el = DOM.el('#topicArea');
    if (el) el.style.display = 'none';
  },

  _showTopics: function() {
    var el = DOM.el('#topicArea');
    if (el) el.style.display = 'block';
  },

  _updateSendBtn: function() {
    var input = DOM.el('#messageInput');
    var btn = DOM.el('#sendBtn');
    if (!btn) return;
    if (input && input.value.trim()) {
      btn.style.background = '#E8943A';
      btn.style.color = '#fff';
    } else {
      btn.style.background = '#E8E3DD';
      btn.style.color = '#999';
    }
  },

  _scrollToBottom: function() {
    var container = DOM.el('#chatMessages');
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  },

  getRecentHistory: function(n) {
    return this.messages.slice(-n).map(function(m) {
      return { role: m.role, content: m.content };
    });
  },

  _formatMessageTime: function(date) {
    var h = date.getHours();
    var prefix = h < 12 ? '上午' : '下午';
    var hh = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    var mm = date.getMinutes();
    return prefix + ' ' + (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  },

  _getAvatar: function() {
    var name = this.voiceName || '';
    var maleKeys = ['爷', '公', '爸', '父', '叔', '伯', '舅', '哥', '弟'];
    var femaleKeys = ['奶', '婆', '妈', '姥', '母', '姨', '姑', '婶', '嫂', '姐', '妹'];
    for (var i = 0; i < maleKeys.length; i++) {
      if (name.indexOf(maleKeys[i]) !== -1) return '👴';
    }
    for (var j = 0; j < femaleKeys.length; j++) {
      if (name.indexOf(femaleKeys[j]) !== -1) return '👵';
    }
    return '🗣️';
  },

  _saveHistory: function() {
    var key = 'chat_history_' + this.voiceId;
    Storage.set(key, this.messages);
  },

  _loadHistory: function() {
    var self = this;
    var key = 'chat_history_' + this.voiceId;
    var saved = Storage.get(key);
    if (!saved || saved.length === 0) {
      self._showTopics();
      return;
    }

    self._hideTopics();
    var container = DOM.el('#chatMessages');
    if (!container) return;
    container.innerHTML = '';

    saved.forEach(function(msg, i) {
      var prevMsg = i > 0 ? saved[i - 1] : null;
      var now = new Date(msg.created_at);
      var timeStr = self._formatMessageTime(now);

      if (prevMsg) {
        var prevDate = new Date(prevMsg.created_at);
        if (prevDate.toDateString() !== now.toDateString()) {
          var days = ['日', '一', '二', '三', '四', '五', '六'];
          var sep = document.createElement('div');
          sep.style.cssText = 'text-align:center; margin:16px 0; color:#999; font-size:13px';
          sep.textContent = '── ' + (now.getMonth() + 1) + '月' + now.getDate() + '日 星期' + days[now.getDay()] + ' ──';
          container.appendChild(sep);
        }
      }

      var avatarEmoji = self._getAvatar();

      if (msg.role === 'assistant') {
        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex; align-items:flex-start; margin-bottom:16px';
        var avatar = document.createElement('div');
        avatar.style.cssText = 'width:36px;height:36px;border-radius:50%;background:#EEE;text-align:center;line-height:36px;font-size:18px;flex-shrink:0';
        avatar.textContent = avatarEmoji;
        wrapper.appendChild(avatar);
        var body = document.createElement('div');
        body.style.cssText = 'margin-left:8px; max-width:70%';
        var bubble = document.createElement('div');
        bubble.style.cssText = 'background:#fff; border-radius:4px 12px 12px 12px; padding:10px 14px; font-size:15px; color:#3C2415; box-shadow:0 1px 3px rgba(0,0,0,0.06); line-height:1.5; word-break:break-word';
        bubble.textContent = msg.content;
        body.appendChild(bubble);
        if (msg.audio_url) {
          var playBtn = document.createElement('button');
          playBtn.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#E8943A;padding:4px 0;margin-top:4px;cursor:pointer;background:none;border:none';
          playBtn.textContent = '▶ 播放';
          playBtn.addEventListener('click', function() { self._playAudio(msg.audio_url, playBtn); });
          body.appendChild(playBtn);
        }
        var timeLabel = document.createElement('div');
        timeLabel.style.cssText = 'margin-top:4px; font-size:12px; color:#999';
        timeLabel.textContent = timeStr;
        body.appendChild(timeLabel);
        wrapper.appendChild(body);
        container.appendChild(wrapper);
      } else {
        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex; flex-direction:row-reverse; align-items:flex-start; margin-bottom:16px';
        var body = document.createElement('div');
        body.style.cssText = 'max-width:70%';
        var bubble = document.createElement('div');
        bubble.style.cssText = 'background:#E8943A; border-radius:12px 4px 12px 12px; padding:10px 14px; font-size:15px; color:#fff; line-height:1.5; word-break:break-word';
        bubble.textContent = msg.content;
        body.appendChild(bubble);
        var timeLabel = document.createElement('div');
        timeLabel.style.cssText = 'margin-top:4px; font-size:12px; color:#999; text-align:right';
        timeLabel.textContent = timeStr;
        body.appendChild(timeLabel);
        wrapper.appendChild(body);
        container.appendChild(wrapper);
      }
    });

    self.messages = saved;
    self._scrollToBottom();
  }
};

document.addEventListener('DOMContentLoaded', function() {
  Chat.init();
});
