/* Safe Spot TTS Engine v2
   Voice selector · Kokoro AI neural voice · Web Speech API fallback
   Exposes: TP / TPause / TStop  (courses 1-11, 13-14)
            TTS_play / TTS_pause / TTS_stop  (course 12)
            SS_ttsVoiceChange  (called by voice <select> onchange)
*/
(function(G){
'use strict';

// ── Helpers ───────────────────────────────────────────────────────────────────
var wsyn = G.speechSynthesis || null;
function el(id){ return document.getElementById(id); }

function setProgress(p){
  // Works with both ttsFill (most courses) and ttsProgress (course12)
  var e = el('ttsFill') || el('ttsProgress');
  if(e) e.style.width = Math.min(100, Math.max(0, p)) + '%';
}
function setStatus(m){
  var e = el('ttsStatus');
  if(e) e.textContent = m;
}
function updateBtns(){
  var pl=el('ttsPlay'), pa=el('ttsPause'), st=el('ttsStop');
  if(!pl) return;
  pl.disabled  = S.active && !S.paused;
  pl.className = 'ttsbtn' + (S.active && !S.paused ? ' on' : '');
  pa.disabled  = !S.active && !S.paused;
  st.disabled  = !S.active && !S.paused;
}
function getSlideText(){
  var s = document.querySelector('.slide.active');
  if(!s) return '';
  var c = s.cloneNode(true);
  c.querySelectorAll('.nav,.return-home-wrap,button,a.return-home-link,.slide-number,.nav-counter').forEach(function(x){ x.remove(); });
  return (c.innerText || c.textContent || '').replace(/\s+/g,' ').trim();
}
function getRate(){
  var sp = el('ttsSpeed');
  return sp ? (parseFloat(sp.value) || 1) : 1;
}

// ── State ─────────────────────────────────────────────────────────────────────
var S = {
  active:      false,
  paused:      false,
  engine:      (function(){ try{ return localStorage.getItem('ss_tts_engine') || 'webspeech'; }catch(e){ return 'webspeech'; } })(),
  voiceURI:    (function(){ try{ return localStorage.getItem('ss_tts_voice') || ''; }catch(e){ return ''; } })(),
  kaTimer:     null,
  // Kokoro AI
  kokoro:      null,
  kokoroLoading: false,
  // Web Audio (Kokoro playback)
  audioCtx:    null,
  audioBuffer: null,
  audioSource: null,
  audioStart:  0,
  audioPauseAt:0,
  audioDuration:0,
  audioTimer:  null,
};

// ── Web Speech keep-alive (fixes Chrome bug that stops speech after ~15s) ─────
function kaStart(){
  kaStop();
  S.kaTimer = setInterval(function(){
    if(wsyn && wsyn.speaking && !wsyn.paused){ wsyn.pause(); wsyn.resume(); }
    else kaStop();
  }, 10000);
}
function kaStop(){ clearInterval(S.kaTimer); S.kaTimer = null; }

// ── Web Speech API ────────────────────────────────────────────────────────────
function wsPlay(){
  if(!wsyn) return;
  if(S.paused && wsyn.paused){
    wsyn.resume();
    S.paused=false; S.active=true; kaStart(); updateBtns(); setStatus('Reading…');
    return;
  }
  wsyn.cancel(); kaStop();
  var text = getSlideText();
  if(!text){ setStatus('Nothing to read on this page'); return; }
  var len = text.length;
  var u = new SpeechSynthesisUtterance(text);
  u.rate = getRate();
  u.lang = 'en-GB';
  // Apply saved voice choice
  if(S.voiceURI){
    var vs = wsyn.getVoices();
    for(var i=0;i<vs.length;i++){
      if(vs[i].voiceURI === S.voiceURI){ u.voice = vs[i]; break; }
    }
  }
  u.onstart    = function(){ S.active=true;  S.paused=false; updateBtns(); setStatus('Reading…'); setProgress(0); kaStart(); };
  u.onend      = function(){ S.active=false; S.paused=false; kaStop(); updateBtns(); setStatus('Done — press play to hear again'); setProgress(100); };
  u.onerror    = function(e){ if(e.error==='interrupted'||e.error==='canceled') return; S.active=false; S.paused=false; kaStop(); updateBtns(); setStatus('Could not read — try again'); };
  u.onboundary = function(ev){
    if(len>0) setProgress((ev.charIndex/len)*100);
    var sn = text.substr(ev.charIndex, 40);
    if(sn) setStatus('“'+sn.trim()+'…');
  };
  wsyn.speak(u);
}
function wsPause(){
  if(wsyn && wsyn.speaking && !wsyn.paused){
    wsyn.pause(); S.paused=true; S.active=false; kaStop(); updateBtns(); setStatus('Paused');
  }
}
function wsStop(){
  if(wsyn) wsyn.cancel();
  S.active=false; S.paused=false; kaStop(); updateBtns();
  setStatus('Press play to hear this page'); setProgress(0);
}

// ── Kokoro AI neural voice ────────────────────────────────────────────────────
async function loadKokoro(){
  if(S.kokoro) return S.kokoro;
  if(S.kokoroLoading) return null;
  S.kokoroLoading = true;
  try {
    // Dynamic import works in modern browsers from non-module scripts
    var mod = await import('https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js');
    var KokoroTTS = mod.KokoroTTS;
    setStatus('Downloading AI voice (60 MB — saved for next time)…');
    S.kokoro = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
      dtype: 'q8',     // quantised — best balance of size and quality
      device: 'wasm',  // runs fully offline in browser
      progress_callback: function(info){
        if(info.status==='downloading' && info.total > 0){
          var pct = Math.round((info.loaded / info.total) * 100);
          setStatus('Downloading AI voice: ' + pct + '%…');
          setProgress(pct);
        }
      }
    });
    S.kokoroLoading = false;
    return S.kokoro;
  } catch(err){
    console.warn('[Safe Spot TTS] Kokoro load failed:', err);
    S.kokoroLoading = false;
    return null;
  }
}

async function aiPlay(){
  if(S.paused && S.audioBuffer){ aiResume(); return; }
  if(S.active) return;
  var text = getSlideText();
  if(!text){ setStatus('Nothing to read on this page'); return; }
  S.active=true; S.paused=false; updateBtns();
  setStatus('Loading AI voice… first time ~30 s, then instant');
  var tts = await loadKokoro();
  if(!tts){
    setStatus('AI voice unavailable — using device voice');
    S.active=false; S.engine='webspeech'; wsPlay(); return;
  }
  setStatus('Generating speech…');
  try {
    var voice = (function(){ try{ return localStorage.getItem('ss_tts_ai_voice') || 'af_heart'; }catch(e){ return 'af_heart'; } })();
    var result = await tts.generate(text, { voice: voice });
    aiPlayBuffer(result.audio, result.sampling_rate, 0);
  } catch(err){
    console.warn('[Safe Spot TTS] Kokoro generate failed:', err);
    setStatus('AI voice error — using device voice');
    S.active=false; S.engine='webspeech'; wsPlay();
  }
}

function aiPlayBuffer(floatArr, sampleRate, offset){
  offset = offset || 0;
  if(!S.audioCtx) S.audioCtx = new (G.AudioContext || G.webkitAudioContext)();
  if(floatArr){
    var buf = S.audioCtx.createBuffer(1, floatArr.length, sampleRate);
    buf.copyToChannel(floatArr, 0);
    S.audioBuffer  = buf;
    S.audioDuration = floatArr.length / sampleRate;
  }
  if(!S.audioBuffer) return;
  if(S.audioSource){ try{ S.audioSource.stop(); }catch(e){} }
  var src = S.audioCtx.createBufferSource();
  src.buffer = S.audioBuffer;
  src.playbackRate.value = getRate();
  src.connect(S.audioCtx.destination);
  S.audioSource = src;
  S.audioStart  = S.audioCtx.currentTime - offset;
  src.start(0, offset);
  S.active=true; S.paused=false; updateBtns(); setStatus('Reading…'); setProgress(0);
  clearInterval(S.audioTimer);
  S.audioTimer = setInterval(function(){
    if(!S.audioCtx) return;
    var elapsed = S.audioCtx.currentTime - S.audioStart;
    var pct = Math.min(100, (elapsed / S.audioDuration) * 100);
    setProgress(pct);
    if(pct >= 100) clearInterval(S.audioTimer);
  }, 200);
  src.onended = function(){
    if(!S.paused){
      clearInterval(S.audioTimer); S.active=false; S.paused=false;
      updateBtns(); setStatus('Done — press play to hear again'); setProgress(100);
    }
  };
}
function aiResume(){
  aiPlayBuffer(null, null, S.audioPauseAt);
  S.active=true; S.paused=false; updateBtns(); setStatus('Reading…');
}
function aiPause(){
  if(!S.active || S.paused) return;
  S.audioPauseAt = S.audioCtx ? (S.audioCtx.currentTime - S.audioStart) : 0;
  if(S.audioSource){ try{ S.audioSource.stop(); }catch(e){} S.audioSource=null; }
  clearInterval(S.audioTimer);
  S.paused=true; S.active=false; updateBtns(); setStatus('Paused');
}
function aiStop(){
  if(S.audioSource){ try{ S.audioSource.stop(); }catch(e){} S.audioSource=null; }
  clearInterval(S.audioTimer);
  S.active=false; S.paused=false; S.audioPauseAt=0;
  updateBtns(); setStatus('Press play to hear this page'); setProgress(0);
}

// ── Voice selector ────────────────────────────────────────────────────────────
function populateVoiceSelector(){
  var sel = el('ttsVoice');
  if(!sel || sel.dataset.pop) return;
  var voices = wsyn ? wsyn.getVoices() : [];
  // English voices only, sorted: local enhanced/premium first
  var en = voices.filter(function(v){ return v.lang && v.lang.indexOf('en')===0; });
  en.sort(function(a, b){
    function score(v){
      var s = v.localService ? 0 : 20;
      if(!/enhanced|premium|neural/i.test(v.name)) s += 5;
      return s;
    }
    return score(a) - score(b);
  });
  var html = '<option value="__ai__">✨ AI Voice (neural, offline)</option>';
  if(en.length){
    html += '<option disabled>── Device voices ──</option>';
    en.forEach(function(v){
      var lbl = v.name;
      if(/enhanced|premium/i.test(v.name)) lbl += ' ⭐';
      if(!v.localService) lbl += ' ↗';
      html += '<option value="' + v.voiceURI.replace(/"/g,'&quot;') + '">' + lbl + '</option>';
    });
  }
  sel.innerHTML = html;
  // Restore saved selection
  if(S.engine === 'ai'){
    sel.value = '__ai__';
  } else if(S.voiceURI){
    sel.value = S.voiceURI;
    if(sel.selectedIndex <= 0) sel.selectedIndex = 0; // fallback if saved voice gone
  }
  sel.dataset.pop = '1';
}

G.SS_ttsVoiceChange = function(){
  var sel = el('ttsVoice');
  if(!sel) return;
  try {
    if(sel.value === '__ai__'){
      S.engine = 'ai';
      localStorage.setItem('ss_tts_engine', 'ai');
    } else {
      S.engine   = 'webspeech';
      S.voiceURI = sel.value;
      localStorage.setItem('ss_tts_engine', 'webspeech');
      localStorage.setItem('ss_tts_voice', sel.value);
    }
  } catch(e){}
};

// ── posBar — position TTS bar below module header ─────────────────────────────
function posBar(){
  var hdr = document.querySelector('.module-header');
  var bar = el('ttsBar');
  if(!hdr || !bar) return;
  var hh = hdr.getBoundingClientRect().height || hdr.offsetHeight || 48;
  bar.style.top = Math.round(hh) + 'px';
  var bh = bar.offsetHeight || 40;
  var mc = document.querySelector('.module-container,main.module-container');
  if(mc) mc.style.paddingTop = Math.round(hh + bh + 12) + 'px';
}

// ── Public API ────────────────────────────────────────────────────────────────
function play(){
  if(S.engine === 'ai') aiPlay();
  else wsPlay();
}
function pause(){
  if(S.engine === 'ai') aiPause();
  else wsPause();
}
function stop(){
  if(S.engine === 'ai') aiStop();
  else wsStop();
}

// Expose all name variants used across the codebase
G.TP         = G.TTS_play  = play;
G.TPause     = G.TTS_pause = pause;
G.TStop      = G.TTS_stop  = stop;

// ── Hook showSlide so TTS resets on every slide change ────────────────────────
// showSlide is defined in the inline script above this file, so we can wrap it now.
(function(){
  var orig = G.showSlide;
  if(typeof orig === 'function'){
    G.showSlide = function(n){
      stop();
      setStatus('Press play to hear this page');
      orig(n);
    };
  }
})();

// ── Init ──────────────────────────────────────────────────────────────────────
G.addEventListener('beforeunload', stop);

if(!wsyn){
  var _bar = el('ttsBar');
  if(_bar) _bar.style.display = 'none';
} else {
  wsyn.getVoices(); // pre-warm — triggers voiceschanged on some browsers
  wsyn.addEventListener('voiceschanged', populateVoiceSelector);
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ populateVoiceSelector(); posBar(); });
  } else {
    setTimeout(function(){ populateVoiceSelector(); posBar(); }, 120);
  }
  G.addEventListener('resize', posBar);
}

})(window);
