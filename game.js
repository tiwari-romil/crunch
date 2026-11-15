/* Crunch — drag-and-drop puzzles.
   index.html is the page, style.css is the ink, this file is the rules. */

(function () {
  var data = window.CRAYON;
  var GATES = data.GATES;
  var LEVELS = data.LEVELS;
  var CHAPTERS = data.CHAPTERS;
  var SANDBOX = data.SANDBOX;
  var NS = "http://www.w3.org/2000/svg";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var store = {
    key: "sparky-sketch-pad-v1",
    data: { stars: {}, muted: false, bits: false, coach: true, place: null, seenDay: "", reviewDue: false, reviewAt: 0 },
    load: function () {
      try {
        var raw = JSON.parse(localStorage.getItem(this.key) || "{}");
        this.data.stars = raw.stars && typeof raw.stars === "object" ? raw.stars : {};
        if (typeof raw.muted === "boolean") this.data.muted = raw.muted;
        if (typeof raw.bits === "boolean") this.data.bits = raw.bits;
        if (typeof raw.coach === "boolean") this.data.coach = raw.coach;
        if (raw.place && typeof raw.place.screen === "string") this.data.place = raw.place;
        if (typeof raw.seenDay === "string") this.data.seenDay = raw.seenDay;
        if (typeof raw.reviewDue === "boolean") this.data.reviewDue = raw.reviewDue;
        if (typeof raw.reviewAt === "number" && raw.reviewAt >= 0) this.data.reviewAt = raw.reviewAt;
      } catch (err) { /* private mode or blocked storage */ }
    },
    save: function () {
      try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (err) {}
    }
  };

  var previewing = false;

  var audio = {
    ctx: null,
    unlock: function () {
      if (store.data.muted) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.ctx) this.ctx = new AC();
      if (this.ctx.state === "suspended") this.ctx.resume();
    },
    tone: function (freq, dur, type, gain, delay, slideTo) {
      if (store.data.muted || !this.ctx) return;
      var t = this.ctx.currentTime + (delay || 0);
      var osc = this.ctx.createOscillator();
      var amp = this.ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.02);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(amp);
      amp.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },
    pop: function () { this.tone(620, 0.07, "sine", 0.05, 0, 420); },
    place: function () {
      this.tone(240, 0.06, "triangle", 0.04, 0);
      this.tone(480, 0.08, "sine", 0.04, 0.05);
    },
    ding: function () {
      this.tone(880, 0.09, "sine", 0.04, 0);
      this.tone(1175, 0.14, "triangle", 0.03, 0.04);
    },
    tick: function () { this.tone(240, 0.05, "sine", 0.03, 0); },
    nope: function () {
      this.tone(392, 0.12, "sine", 0.045, 0);
      this.tone(330, 0.18, "sine", 0.04, 0.1);
    },
    win: function () {
      [523, 659, 784, 1046].forEach(function (freq, i) {
        audio.tone(freq, 0.18, "sine", 0.06, i * 0.09);
      });
    },
    hello: function () {
      this.tone(523, 0.1, "sine", 0.04, 0);
      this.tone(659, 0.14, "sine", 0.04, 0.09);
    },
    page: function () {
      this.tone(740, 0.05, "triangle", 0.04, 0);
      this.tone(988, 0.08, "sine", 0.03, 0.05);
    },
    roar: function () {
      this.tone(196, 0.28, "sawtooth", 0.035, 0, 70);
    },
    musicOn: false,
    nextBeat: 0,
    stepN: 0,
    noise: null,
    startMusic: function () {
      return;
      if (this.musicOn || store.data.muted) return;
      this.unlock();
      if (!this.ctx) return;
      this.musicOn = true;
      this.stepN = 0;
      this.nextBeat = this.ctx.currentTime + 0.08;
    },
    stopMusic: function () {
      this.musicOn = false;
    },
    hat: function (time) {
      if (!this.noise) {
        var buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.05), this.ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        this.noise = buffer;
      }
      var src = this.ctx.createBufferSource();
      var filter = this.ctx.createBiquadFilter();
      var amp = this.ctx.createGain();
      src.buffer = this.noise;
      filter.type = "highpass";
      filter.frequency.setValueAtTime(2800, time);
      amp.gain.setValueAtTime(0.018, time);
      amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
      src.connect(filter);
      filter.connect(amp);
      amp.connect(this.ctx.destination);
      src.start(time);
      src.stop(time + 0.05);
    },
    pump: function () {
      if (!this.musicOn || !this.ctx || store.data.muted || document.hidden) return;
      var now = this.ctx.currentTime;
      if (this.nextBeat < now - 0.4) this.nextBeat = now;
      var melody = [659, 0, 784, 659, 587, 0, 523, 587, 659, 0, 784, 880, 784, 659, 523, 0];
      var bass = [262, 0, 0, 196, 262, 0, 0, 196, 220, 0, 0, 175, 262, 0, 0, 196];
      var guard = 0;
      while (this.nextBeat < now + 0.22 && guard < 3) {
        var step = this.stepN % 16;
        var delay = Math.max(0, this.nextBeat - now);
        if (melody[step]) this.tone(melody[step], 0.22, "triangle", 0.03, delay);
        if (bass[step]) this.tone(bass[step], 0.28, "sine", 0.028, delay);
        if (step % 4 === 0) this.hat(this.nextBeat);
        this.stepN = (this.stepN + 1) % 16;
        this.nextBeat += 0.34;
        guard += 1;
      }
    }
  };

  var voice = {
    say: function () {},
    stop: function () {}
  };

  var state = {
    screen: "home",
    levelIndex: 0,
    sandbox: false,
    inputs: [],
    placed: null,
    phase: "pick",
    demoRow: -1,
    shake: false,
    grownups: false,
    note: "",
    panel: 0,
    bags: {},
    loopN: 1,
    spell: [],
    runHead: -1,
    bossBag: 0,
    bossLoop: 1,
    bossLocks: {},
    running: false,
    replaying: false,
    reviewing: false,
    promptAt: 0,
    promptLine: ""
  };

  var demoToken = 0;
  var waiters = [];
  var lastKey = "";
  var lampWasOn = false;
  var sparkState = new WeakMap();
  var screenEl = null;
  var lastSaid = "";

  function currentLevel() {
    return state.sandbox ? SANDBOX : LEVELS[state.levelIndex];
  }

  function activeInputs() {
    var level = currentLevel();
    if (level.sandbox) {
      var n = state.placed ? GATES[state.placed].inputs : 1;
      return level.inputs.slice(0, n);
    }
    return level.inputs || [];
  }

  function copyBag(src) {
    var out = {};
    if (!src) return out;
    Object.keys(src).forEach(function (key) { out[key] = src[key]; });
    return out;
  }

  function chapterLevels(id) {
    return LEVELS.filter(function (level) { return level.chapter === id; });
  }

  function chapterOpen() {
    return true;
  }

  function earnedCount() {
    return LEVELS.filter(function (level) { return store.data.stars[level.id]; }).length;
  }

  function allEarned() {
    return earnedCount() === LEVELS.length;
  }

  function continueIndex() {
    var index = LEVELS.findIndex(function (level) { return !store.data.stars[level.id]; });
    return index === -1 ? 0 : index;
  }

  function dayKey() {
    var now = new Date();
    return now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
  }

  function reviewPool() {
    return LEVELS.filter(function (level) {
      if (!store.data.stars[level.id]) return false;
      if (level.kind === "tale" || level.kind === "wake") return false;
      return true;
    });
  }

  function reviewLevel() {
    var pool = reviewPool();
    if (!pool.length) return null;
    return pool[(store.data.reviewAt || 0) % pool.length];
  }

  function stampDay() {
    if (previewing) return;
    var today = dayKey();
    var prior = store.data.seenDay;
    if (prior && prior !== today && reviewPool().length) store.data.reviewDue = true;
    store.data.seenDay = today;
    store.save();
  }

  function offerReview() {
    var level = reviewLevel();
    if (!level) return false;
    var index = LEVELS.findIndex(function (item) { return item.id === level.id; });
    if (index < 0) return false;
    beginLevel(index, true);
    return true;
  }

  function shouldOfferReview() {
    return false;
  }

  function gateMatches(level, gateId) {
    return level.rows.every(function (row) { return GATES[gateId].run(row.in) === row.out; });
  }

  function sameInputs(a, b) {
    return a.length === b.length && a.every(function (value, i) { return value === b[i]; });
  }

  function wireModel() {
    var level = currentLevel();
    var inputs = activeInputs();
    var connected = !!state.placed && state.phase !== "pick";
    var live = connected && state.phase !== "drawing";
    var output = false;
    if (live) output = !!GATES[state.placed].run(state.inputs);
    var wires = [];
    var count = inputs.length;
    for (var i = 0; i < count; i++) {
      wires.push({
        id: "in-" + i,
        hot: !!state.inputs[i] && state.phase !== "drawing",
        color: inputs[i].color,
        dashed: !connected,
        from: "emit-" + i,
        to: count === 1 ? "in-0" : "in-" + i,
        seed: i + 1
      });
    }
    if (connected) {
      wires.push({
        id: "out",
        hot: live && output,
        color: "#e39b00",
        dashed: false,
        from: "gate-out",
        to: "lamp-port",
        seed: 9
      });
    }
    var anyIn = state.inputs.some(Boolean);
    return {
      wires: wires,
      output: live && output,
      flow: live && anyIn && output,
      born: live && !anyIn && output,
      blocked: live && anyIn && !output
    };
  }

  function speechText() {
    var level = currentLevel();
    if (state.reviewing && state.phase === "success") return "The old lock opened again.";
    if (level.kind === "tale") return level.panels[Math.min(state.panel, level.panels.length - 1)].line;
    if (level.sandbox) {
      if (!state.placed) return level.speech;
      return GATES[state.placed].blurb;
    }
    if (state.phase === "drawing") return "Checking the pictures.";
    if (state.phase === "demo") return "Does the lamp match the picture?";
    if (state.phase === "fail") return level.hint;
    if (state.phase === "success") return level.yay;
    if (level.kind === "pick" && state.promptAt > 0 && state.promptLine) return state.promptLine;
    if (state.reviewing && state.phase === "pick") return "Old lock. No page this time. " + level.speech;
    return level.speech;
  }

  function comicFlags(index, row) {
    var live = sameInputs(state.inputs, row.in);
    if (!state.placed || state.phase === "pick" || state.phase === "drawing") {
      return { live: live, good: false, bad: false };
    }
    if (state.phase === "demo") {
      if (index > state.demoRow) return { live: false, good: false, bad: false };
      if (index === state.demoRow) return { live: true, good: false, bad: false };
      return { live: false, good: true, bad: false };
    }
    var ok = GATES[state.placed].run(row.in) === row.out;
    return { live: live, good: ok, bad: !ok };
  }

  function crayonLetters(text) {
    var colors = ["#ef3b3b", "#f07a12", "#c98900", "#1f9d4d", "#2f78e6", "#7a45d6", "#e84393"];
    return Array.from(text).map(function (ch, i) {
      if (ch === " ") return " ";
      var rot = ((i % 5) - 2) * 1.6;
      return '<span style="color:' + colors[i % colors.length] + ";--r:" + rot + "deg;--d:" + (i * 28) + 'ms">' + ch + "</span>";
    }).join("");
  }

  function glyph(id) {
    if (id === "moon") {
      return '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M44 8a22 22 0 1 0 0 48 16 16 0 1 1 0-48z"/></svg>';
    }
    return '<svg class="switch-ico" viewBox="0 0 64 64" aria-hidden="true"><rect x="16" y="6" width="32" height="52" rx="8" fill="#fffaf1" stroke="currentColor" stroke-width="4"/><rect class="lever" x="22" y="30" width="20" height="22" rx="4" fill="currentColor"/></svg>';
  }

  function controlLabel(input, on) {
    if (input.id === "switch") return "Switch, " + (on ? "on" : "off");
    return input.name + " button, " + (on ? "on" : "off");
  }

  function gateArt(id) {
    if (id === "same") {
      return '<svg viewBox="0 0 80 56"><path class="gstroke" d="M8 28h48"/><path class="gstroke" d="M46 16l16 12-16 12"/></svg>';
    }
    if (id === "not") {
      return '<svg viewBox="0 0 80 56"><path class="gfill" d="M12 10v36l40-18z"/><circle class="gfill" cx="64" cy="28" r="7"/></svg>';
    }
    if (id === "and") {
      return '<svg viewBox="0 0 80 56"><path class="gfill" d="M12 8h26c22 0 32 10 32 20s-10 20-32 20H12z"/></svg>';
    }
    return '<svg viewBox="0 0 80 56"><path class="gfill" d="M16 10c22 0 30 8 46 18-16 10-24 18-46 18 12 0 20-8 20-18S28 10 16 10z"/></svg>';
  }

  function lampGraphic() {
    return '' +
      '<div class="rays" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
      '<svg class="bulb" viewBox="0 0 80 110" aria-hidden="true">' +
        '<defs><clipPath id="bulb-clip"><path d="M40 8c-16 0-28 14-28 32 0 14 7 24 16 32v8h24v-8c9-8 16-18 16-32C68 22 56 8 40 8z"/></clipPath></defs>' +
        '<g clip-path="url(#bulb-clip)"><rect class="juice" x="8" y="8" width="64" height="76"/></g>' +
        '<path class="glass" d="M40 8c-16 0-28 14-28 32 0 14 7 24 16 32v12h24V72c9-8 16-18 16-32C68 22 56 8 40 8z"/>' +
        '<path class="shine" d="M28 24c2 8-2 16-4 26"/>' +
        '<path class="filament" d="M33 64l7-14 7 14"/>' +
        '<rect class="cap" x="30" y="84" width="20" height="8" rx="1"/>' +
        '<rect class="cap" x="33" y="93" width="14" height="6" rx="1"/>' +
        '<rect class="cap" x="36" y="100" width="8" height="5" rx="1"/>' +
      "</svg>";
  }

  function sparkyMarkup() {
    return '' +
      '<svg id="sparky" class="sparky ' + (arguments[0] || "") + '" viewBox="0 0 80 96" aria-hidden="true">' +
        '<ellipse cx="40" cy="90" rx="16" ry="4" fill="rgba(44,36,22,0.12)"/>' +
        '<path d="M40 8c-16 0-26 16-26 32 0 18 10 30 26 30s26-12 26-30C66 24 56 8 40 8z" fill="#ffe56a" stroke="#2c2416" stroke-width="3"/>' +
        '<path class="shine" d="M28 22c2 8-1 14-3 22"/>' +
        '<rect x="30" y="70" width="20" height="8" rx="2" fill="#d7d0c4" stroke="#2c2416" stroke-width="3"/>' +
        '<circle class="eye" cx="30" cy="40" r="3.4" fill="#2c2416"/>' +
        '<circle class="eye" cx="50" cy="40" r="3.4" fill="#2c2416"/>' +
        '<circle cx="26" cy="48" r="3" fill="#ffb0b0" opacity="0.85"/>' +
        '<circle cx="54" cy="48" r="3" fill="#ffb0b0" opacity="0.85"/>' +
        '<path class="mouth" d="M32 52q8 7 16 0" fill="none" stroke="#2c2416" stroke-width="2.5" stroke-linecap="round"/>' +
        '<g class="arms-idle" fill="none" stroke="#2c2416" stroke-width="3" stroke-linecap="round">' +
          '<path d="M16 50 6 58"/><path d="M64 50l10 8"/>' +
        "</g>" +
        '<g class="arms-cheer" fill="none" stroke="#2c2416" stroke-width="3" stroke-linecap="round">' +
          '<path d="M18 36 8 22"/><path d="M62 36l10-14"/>' +
        "</g>" +
      "</svg>";
  }

  function heroMarkup(mood) {
    return '' +
      '<svg id="sparky" class="sparky ' + (mood || "") + '" viewBox="0 0 80 96" aria-hidden="true">' +
        '<ellipse cx="40" cy="90" rx="16" ry="4" fill="rgba(20,16,8,0.15)"/>' +
        '<path d="M30 46 L12 78 L36 68 Z" fill="#e43737" stroke="#1a140e" stroke-width="3"/>' +
        '<path d="M50 46 L68 78 L44 68 Z" fill="#c42d2d" stroke="#1a140e" stroke-width="3"/>' +
        '<rect x="26" y="46" width="28" height="28" rx="7" fill="#2f78e6" stroke="#1a140e" stroke-width="3"/>' +
        '<circle cx="40" cy="32" r="16" fill="#ffd2a8" stroke="#1a140e" stroke-width="3"/>' +
        '<path d="M24 30 Q28 12 40 14 Q56 10 58 32 Q46 18 40 20 Q30 18 24 30" fill="#3b2414" stroke="#1a140e" stroke-width="3"/>' +
        '<circle class="eye" cx="34" cy="33" r="2.3" fill="#1a140e"/>' +
        '<circle class="eye" cx="47" cy="33" r="2.3" fill="#1a140e"/>' +
        '<path class="mouth" d="M34 40 q6 6 13 0" fill="none" stroke="#1a140e" stroke-width="2.4" stroke-linecap="round"/>' +
        '<g class="arms-idle" fill="none" stroke="#1a140e" stroke-width="3" stroke-linecap="round">' +
          '<path d="M54 58 H70"/><path d="M66 50 V66"/>' +
        "</g>" +
        '<g class="arms-cheer" fill="none" stroke="#1a140e" stroke-width="3" stroke-linecap="round">' +
          '<path d="M52 40 L70 22"/><path d="M64 18 H76"/>' +
        "</g>" +
      "</svg>";
  }

  function dragonMarkup(mood) {
    return '' +
      '<svg class="dragon ' + (mood || "") + '"' + (arguments[1] === false ? "" : ' id="dragon"') + ' viewBox="0 0 140 100" aria-hidden="true">' +
        '<ellipse cx="70" cy="92" rx="28" ry="5" fill="rgba(20,16,8,0.15)"/>' +
        '<path d="M18 58 Q8 30 28 34 Q20 18 40 28" fill="#3aa34a" stroke="#1a140e" stroke-width="3"/>' +
        '<path d="M122 58 Q132 30 112 34 Q120 18 100 28" fill="#2f8a3c" stroke="#1a140e" stroke-width="3"/>' +
        '<ellipse cx="72" cy="58" rx="40" ry="26" fill="#3cb54d" stroke="#1a140e" stroke-width="3"/>' +
        '<ellipse cx="78" cy="64" rx="22" ry="14" fill="#d8f5a2" stroke="#1a140e" stroke-width="3"/>' +
        '<circle cx="104" cy="46" r="16" fill="#3cb54d" stroke="#1a140e" stroke-width="3"/>' +
        '<path d="M96 34 L92 18 L104 30 L110 16 L112 32" fill="#2f8a3c" stroke="#1a140e" stroke-width="3"/>' +
        '<circle cx="110" cy="44" r="2.4" fill="#1a140e"/>' +
        '<path class="mad" d="M118 58 q-8 8-16 0" fill="none" stroke="#1a140e" stroke-width="2.5" stroke-linecap="round"/>' +
        '<path class="calm" d="M116 56 q-6 8-14 2" fill="none" stroke="#1a140e" stroke-width="2.5" stroke-linecap="round"/>' +
        '<path d="M28 70 Q16 88 34 80" fill="none" stroke="#1a140e" stroke-width="3" stroke-linecap="round"/>' +
      "</svg>";
  }

  var TOKEN_NAMES = { block: "Block", spark: "Spark", nap: "Nap", right: "Right", jump: "Jump", sit: "Sit", heart: "Heart", apple: "Apple" };

  function icon(id) {
    if (id === "heart") return '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#e43737" stroke="#1a140e" stroke-width="2" d="M16 27 L5 16 a6 6 0 0 1 11-6 a6 6 0 0 1 11 6 Z"/></svg>';
    if (id === "apple") return '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="18" r="9" fill="#e23b3b" stroke="#1a140e" stroke-width="2"/><path d="M16 10 V5 M16 7 q6-2 7 3" fill="none" stroke="#2f7a32" stroke-width="2"/></svg>';
    if (id === "block") return '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6 L40 14 V26 C40 36 24 44 24 44 C24 44 8 36 8 26 V14 Z" fill="#3a86ff" stroke="#1a140e" stroke-width="3"/></svg>';
    if (id === "spark") return '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4 L28 18 H42 L30 26 L34 42 L24 32 L14 42 L18 26 L6 18 H20 Z" fill="#ffd23a" stroke="#1a140e" stroke-width="3"/></svg>';
    if (id === "nap") return '<svg viewBox="0 0 48 48" aria-hidden="true"><text x="8" y="32" font-size="22" font-family="Fredoka, sans-serif" fill="#6d4cc4">Zz</text></svg>';
    if (id === "right") return '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 24 H32 M22 12 L38 24 L22 36" fill="none" stroke="#1a140e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if (id === "jump") return '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 40 V16 M12 24 L24 8 L36 24" fill="none" stroke="#1a140e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if (id === "sit") return '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="14" r="6" fill="#ffd2a8" stroke="#1a140e" stroke-width="2"/><path d="M24 20 V30 H36 M18 42 H30 M24 30 L16 42" fill="none" stroke="#1a140e" stroke-width="3" stroke-linecap="round"/></svg>';
    return "";
  }

  function portraitFile(mood, who) {
    if (who === "blaze") return mood === "friend" ? "art/blaze-friend.jpg" : "art/blaze.jpg";
    if (mood === "cheer") return "art/hridhaan-cheer.jpg";
    if (mood === "think") return "art/hridhaan-think.jpg";
    return "art/hridhaan.jpg";
  }

  function charaStill(file, fallback, imgId) {
    var idAttr = imgId ? ' id="' + imgId + '"' : "";
    return '<span class="chara-frame"><img class="manga-face"' + idAttr + ' src="' + file + '" alt="" onerror="var p=this.parentNode;this.remove();if(p)p.classList.add(\'svg-only\')">' +
      '<span class="svg-hero">' + fallback + "</span></span>";
  }

  function taleArt(panel) {
    var who = panel.who || "hridhaan";
    var mood = panel.mood || "";
    var prop = "";
    if (panel.art === "bag") prop = '<div class="prop-bag">' + icon("heart") + icon("heart") + icon("heart") + "</div>";
    if (panel.art === "loop") prop = '<span class="big-num">4</span>';
    if (panel.art === "spell") prop = icon("block") + icon("spark");
    if (panel.art === "steps") prop = icon("right") + icon("right") + icon("jump");
    if (panel.art === "signal") prop = '<div class="lamp on mini-hero-lamp">' + lampGraphic() + "</div>";
    if (panel.art === "chase" || panel.art === "strike") {
      var bunnyMood = panel.art === "strike" ? "cheer" : "";
      return '<div class="duo">' + charaStill(portraitFile(bunnyMood, "hridhaan"), heroMarkup(bunnyMood)) + charaStill(portraitFile("", "blaze"), dragonMarkup("mad")) + "</div>";
    }
    if (panel.art === "bow") {
      return '<div class="duo">' + charaStill(portraitFile("cheer", "hridhaan"), heroMarkup("cheer")) + charaStill(portraitFile("friend", "blaze"), dragonMarkup("friend")) + "</div>";
    }
    if (who === "blaze" || panel.art === "dragon") {
      return '<div class="duo">' + charaStill(portraitFile(mood, "blaze"), dragonMarkup(mood === "friend" ? "friend" : "mad")) + prop + "</div>";
    }
    return '<div class="duo">' + charaStill(portraitFile(mood, "hridhaan"), heroMarkup(mood)) + prop + "</div>";
  }

  function formById() {
    return null;
  }

  function lineNow() {
    if (state.screen === "home") return { text: "Drag gates. Then bags, loops, and steps.", who: "narrator" };
    if (state.screen === "done") return { text: "Logic, variables, loops, functions, and programs.", who: "narrator" };
    if (state.screen !== "play") return { text: "", who: "narrator" };
    var level = currentLevel();
    if (level.kind === "tale") {
      var panel = level.panels[state.panel];
      return { text: panel.line, who: panel.who || "narrator" };
    }
    var who = level.who || "hridhaan";
    if (state.phase === "fail" || state.phase === "success") who = "narrator";
    return { text: speechText(), who: who };
  }

  function narrateCurrent() {}

  function topBar(title) {
    var countLabel = state.sandbox ? "Play pad" : state.reviewing ? "Old lock" : (state.levelIndex + 1) + " / " + LEVELS.length;
    return '' +
      '<header class="top">' +
        '<button type="button" class="ghost" data-action="map">Path</button>' +
        '<div class="top-title"><strong>' + title + '</strong><span class="count">' + countLabel + "</span></div>" +
        '<div class="top-actions"><div class="stars" id="star-row">' + (state.sandbox ? "" : starRow()) + "</div>" +
        '<button type="button" class="icon-btn" id="mute" data-action="mute" aria-label="Sound">' + (store.data.muted ? "🔇" : "🔊") + "</button>" +
        '<button type="button" class="tiny" data-action="grownups">Grownups</button></div>' +
      "</header>";
  }

  function talkBar(text) {
    return '<p class="prompt" id="speech">' + text + "</p>";
  }

  function miniBtn(input, on) {
    var kind = input.id === "switch" ? " switch" : "";
    return '<span class="mini-btn' + kind + (on ? " on" : "") + '" style="--wax:' + input.color + '">' + glyph(input.id) + "</span>";
  }

  function arrow() {
    return '<svg class="arrow" viewBox="0 0 36 16" aria-hidden="true"><path d="M2 8h26M22 3l8 5-8 5"/></svg>';
  }

  function rowLabel(level, row) {
    var parts = row.in.map(function (on, i) {
      return level.inputs[i].name + (on ? " on" : " off");
    });
    return parts.join(", ") + ", lamp " + (row.out ? "on" : "off") + ". Try this picture.";
  }

  function grownupsPanel() {
    var gateLine = "";
    if (state.screen === "play" && state.placed) gateLine = "<p>" + GATES[state.placed].grown + "</p>";
    return '' +
      '<section class="grownups" id="grownups"' + (state.grownups ? "" : " hidden") + ">" +
        "<h3>For grownups</h3>" +
        "<p>Each page is a puzzle. Logic is drag-and-drop gates: Copy, Opposite, Both, and Either. A button is a bit. On is 1, off is 0. Then a named bag (a variable), a counted repeat (a loop), a named card of steps (a function), and steps in order (a program). The last page uses the bag, the loop, and the function.</p>" +
        gateLine +
        '<div class="check-row"><label><input type="checkbox" id="bits"' + (store.data.bits ? " checked" : "") + "> Show 1 and 0 on the wires</label>" +
        '<button type="button" class="tiny danger" data-action="reset">Reset progress</button>' +
        '<button type="button" class="tiny" data-action="close-grownups">Close</button></div>' +
        "<p>Keys: 1 flips the switch, 2 presses the moon. Left and right arrows drop a gate. Escape goes back to the path.</p>" +
        "<p>Mute keeps the sounds quiet.</p>" +
      "</section>";
  }

  function starRow() {
    if (state.sandbox) return "";
    var chapter = currentLevel().chapter;
    return LEVELS.map(function (level, i) {
      return { level: level, i: i };
    }).filter(function (item) {
      return !chapter || item.level.chapter === chapter;
    }).map(function (item) {
      var cls = (store.data.stars[item.level.id] ? " on" : "") + (item.i === state.levelIndex ? " here" : "");
      return '<i class="' + cls.trim() + '">★</i>';
    }).join("");
  }

  function homeHTML() {
    var earned = earnedCount();
    var note = earned ? '<p class="progress-note">' + earned + " of " + LEVELS.length + " pages</p>" : "";
    return '' +
      '<section class="home">' +
        '<p class="kicker">Logic and programs</p>' +
        '<h1 class="title"><span class="logo-frame"><img class="game-logo" src="art/logo.svg" alt="Crunch" onerror="var f=this.parentNode;this.remove();if(f)f.classList.add(\'logo-off\')"></span><span class="logo-letters">' + crayonLetters("Crunch") + "</span></h1>" +
        '<p class="prompt">Drag gates. Then bags, loops, and steps.</p>' +
        note +
        '<button type="button" class="cta" data-action="open">Open the puzzles</button>' +
        '<div class="home-tools">' +
          '<button type="button" class="tiny" data-action="grownups">Grownups</button>' +
          '<button type="button" class="tiny danger" data-action="reset">Reset progress</button>' +
        "</div>" +
        grownupsPanel() +
      "</section>";
  }

  function mapHTML() {
    var earned = earnedCount();
    var done = allEarned();
    var label = done ? "Play again" : earned ? "Keep going" : "Start";
    var lands = CHAPTERS.map(function (chapter, i) {
      var open = chapterOpen(i);
      var levels = chapterLevels(chapter.id);
      var got = levels.filter(function (level) { return store.data.stars[level.id]; }).length;
      return '<button type="button" class="land' + (open ? " open" : " soon") + '" data-action="' + (open ? "land" : "locked") + '" data-chapter="' + chapter.id + '">' +
        '<span class="k">' + chapter.kicker + "</span>" +
        "<strong>" + chapter.title + "</strong>" +
        '<span class="pips">' + got + " / " + levels.length + (open ? "" : " · locked") + "</span>" +
      "</button>";
    }).join("");
    var ending = done ? '<button type="button" class="ghost" data-action="done">See the ending</button>' : "";
    return '' +
      '<section class="map">' +
        "<h2>The path</h2>" +
        '<div class="lands">' + lands + "</div>" +
        '<p class="note" id="note">' + (state.note || "") + "</p>" +
        '<div class="actions">' +
          '<button type="button" class="cta" data-action="continue">' + label + "</button>" +
          ending +
          '<button type="button" class="ghost" data-action="pad">Free draw</button>' +
          '<button type="button" class="tiny" data-action="home">Cover</button>' +
          '<button type="button" class="tiny" data-action="grownups">Grownups</button>' +
          '<button type="button" class="tiny danger" data-action="reset">Reset progress</button>' +
        "</div>" +
        grownupsPanel() +
      "</section>";
  }

  function doneHTML() {
    var words = [
      ["Copy", "SAME"],
      ["Opposite", "NOT"],
      ["Both", "AND"],
      ["Either", "OR"],
      ["Bag", "variable"],
      ["Again", "loop"],
      ["Card", "function"],
      ["Line", "program"]
    ].map(function (pair) {
      return "<li><b>" + pair[0] + "</b><span>" + pair[1] + "</span></li>";
    }).join("");
    return '' +
      '<section class="done">' +
        "<h2>Puzzles done</h2>" +
        '<p class="prompt">Logic, variables, loops, functions, and programs.</p>' +
        '<ul class="learned">' + words + "</ul>" +
        '<div class="actions">' +
          '<button type="button" class="cta" data-action="level" data-level="0">Play again</button>' +
          '<button type="button" class="ghost" data-action="pad">Free draw</button>' +
          '<button type="button" class="ghost" data-action="map">The path</button>' +
        "</div>" +
      "</section>";
  }

  function playHTML() {
    var level = currentLevel();
    var inputs = activeInputs();
    var gate = state.placed ? GATES[state.placed] : null;
    var countLabel = state.sandbox ? "Play pad" : state.reviewing ? "Old lock" : (state.levelIndex + 1) + " / " + LEVELS.length;
    var buttons = inputs.map(function (input, i) {
      var on = !!state.inputs[i];
      var kind = input.id === "switch" ? " switch" : "";
      return '' +
        '<div class="wax-wrap">' +
          '<button type="button" class="wax' + kind + (on ? " on" : "") + '" id="btn-' + i + '" style="--wax:' + input.color + '" data-action="toggle" data-index="' + i + '" aria-pressed="' + (on ? "true" : "false") + '" aria-label="' + controlLabel(input, on) + '">' +
            glyph(input.id) +
            '<span class="bit"' + (store.data.bits ? "" : " hidden") + ">" + (on ? "1" : "0") + "</span>" +
            '<i class="port" id="emit-' + i + '"></i>' +
          "</button>" +
          '<span class="wax-label">' + input.name + "</span>" +
        "</div>";
    }).join("");
    var slotInner = gate
      ? '<div class="slot-inner"><div class="gate-draw">' + gateArt(gate.id) + '</div><div class="slot-kid">' + gate.kid + '</div><div class="slot-name">' + gate.name + "</div></div>"
      : '<div class="slot-empty">drag a gate</div>';
    var comics = "";
    if (!level.sandbox) {
      comics = '<div class="comics-wrap"><p class="rule-line">Match every picture</p><div class="comics">' +
        level.rows.map(function (row, i) {
          return '<button type="button" class="comic" id="comic-' + i + '" data-action="row" data-row="' + i + '" aria-label="' + rowLabel(level, row) + '">' +
            '<span class="mini-ins">' + row.in.map(function (on, k) { return miniBtn(level.inputs[k], on); }).join("") + "</span>" +
            arrow() +
            '<span class="mini-lamp' + (row.out ? " on" : "") + '"></span>' +
            '<span class="mark"></span>' +
          "</button>";
        }).join("") +
      "</div></div>";
    }
    var cards = level.choices.map(function (id) {
      var item = GATES[id];
      var selected = state.placed === id;
      return '<button type="button" class="gate-card' + (selected ? " selected" : "") + '" style="--wax:' + item.color + '" data-gate="' + id + '" aria-pressed="' + (selected ? "true" : "false") + '">' +
        '<span class="gate-draw">' + gateArt(id) + "</span>" +
        '<span class="gate-kid">' + item.kid + "</span>" +
        '<span class="gate-name">' + item.name + "</span>" +
      "</button>";
    }).join("");
    var nextLabel = state.levelIndex >= LEVELS.length - 1 ? "Finish" : "Onward";
    return '' +
      '<section class="play">' +
        '<header class="top">' +
          '<button type="button" class="ghost" data-action="map">Path</button>' +
          '<div class="top-title"><strong>' + level.title + '</strong><span class="count">' + countLabel + "</span></div>" +
          '<div class="top-actions"><div class="stars" id="star-row">' + (level.sandbox ? "" : starRow()) + "</div>" +
          '<button type="button" class="icon-btn" id="mute" data-action="mute" aria-label="Sound">' + (store.data.muted ? "🔇" : "🔊") + "</button>" +
          '<button type="button" class="tiny" data-action="grownups">Grownups</button></div>' +
        "</header>" +
        talkBar(speechText()) +
        '<div class="stage" id="stage">' +
          '<svg class="wires" id="wires"></svg>' +
          '<div class="nodes">' +
            '<div class="inputs">' + buttons + "</div>" +
            '<div class="slot' + (gate ? " filled" : "") + (inputs.length === 2 ? " two" : " one") + '" id="slot"' + (gate ? ' style="--wax:' + gate.color + '"' : "") + ">" +
              '<i class="port" id="in-0"></i><i class="port" id="in-1"></i><i class="port" id="gate-out"></i>' +
              slotInner +
            "</div>" +
            '<div class="lamp-col"><div class="lamp" id="lamp">' +
              '<i class="port" id="lamp-port"></i>' +
              lampGraphic() +
              '<span class="bit" id="lamp-bit" hidden>0</span>' +
            "</div><span class=\"lamp-name\">Lamp</span></div>" +
          "</div>" +
        "</div>" +
        comics +
        '<p class="tray-label">Drag a gate <span class="coach" id="coach" hidden>onto the box</span></p>' +
        '<div class="tray-scroll">' + cards + "</div>" +
        '<div class="play-actions">' +
          '<button type="button" class="ghost" id="let-try" data-action="try" hidden>Let me try</button>' +
          '<button type="button" class="ghost" id="watch" data-action="watch" hidden>Watch</button>' +
          '<button type="button" class="cta" id="next" data-action="next" hidden>' + nextLabel + "</button>" +
        "</div>" +
        grownupsPanel() +
      "</section>";
  }

  function taleHTML() {
    var level = currentLevel();
    var panel = level.panels[state.panel];
    var last = state.panel >= level.panels.length - 1;
    var who = panel.who || "narrator";
    var tag = who === "blaze" ? "Blaze" : (who === "hridhaan" ? "Bunny" : "Story");
    var known = panel.form ? formById(panel.form) : null;
    var ribbon = known ? '<p class="form-ribbon"><span>' + known.order + "</span> " + known.name + "</p>" : "";
    var strike = panel.art === "strike" ? " strike" : "";
    var dots = level.panels.map(function (_, i) {
      return '<i class="' + (i === state.panel ? "on" : "") + '"></i>';
    }).join("");
    return '' +
      '<section class="play tale">' +
        topBar(level.title) +
        '<p class="burst">' + panel.burst + "</p>" +
        '<div class="panel manga' + strike + '"><span class="name-tag">' + tag + "</span>" + ribbon + '<div class="tale-art">' + taleArt(panel) + '</div>' +
        '<p class="balloon">' + panel.line + '</p>' +
        '<button type="button" class="hear" data-action="hear" aria-label="Hear the line">Hear</button></div>' +
        '<div class="panel-dots">' + dots + "</div>" +
        '<div class="play-actions"><button type="button" class="cta" data-action="tale-next">' + (last ? "Let's try" : "Next") + "</button></div>" +
        grownupsPanel() +
      "</section>";
  }

  function tokenButton(id, action) {
    return '<button type="button" class="token-btn" data-action="' + action + '" data-token="' + id + '">' +
      icon(id) + "<span>" + (TOKEN_NAMES[id] || id) + "</span></button>";
  }

  function bagFace(bag) {
    var count = state.bags[bag.id] || 0;
    var tokens = "";
    for (var i = 0; i < count; i++) tokens += icon(bag.token);
    if (!count) tokens = '<span class="empty">empty</span>';
    return '' +
      '<div class="bag">' +
        "<strong>" + bag.name + "</strong>" +
        '<div class="token-row">' + tokens + "</div>" +
        '<div class="stepper">' +
          '<button type="button" data-action="bag-sub" data-bag="' + bag.id + '" aria-label="Take one from ' + bag.name + '">−</button>' +
          '<button type="button" data-action="bag-add" data-bag="' + bag.id + '" aria-label="Add one to ' + bag.name + '">+</button>' +
        "</div>" +
      "</div>";
  }

  function spellSlots(level) {
    var html = "";
    for (var i = 0; i < level.recipe.length; i++) {
      var id = state.spell[i];
      html += '<button type="button" class="slot-token' + (state.runHead === i ? " run" : "") + '" data-action="unspell" data-index="' + i + '">' +
        (id ? icon(id) + "<span>" + TOKEN_NAMES[id] + "</span>" : '<span class="empty">?</span>') +
      "</button>";
    }
    return html;
  }

  function questHTML() {
    var level = currentLevel();
    var body = "";
    if (level.kind === "bags" && level.mode === "count") {
      body = '<div class="bag-row">' + level.bags.map(bagFace).join("") + "</div>";
    } else if (level.kind === "bags") {
      var shown = state.bags.hearts || 0;
      var hearts = "";
      for (var h = 0; h < shown; h++) hearts += icon("heart");
      if (!shown) hearts = '<span class="empty">empty</span>';
      body = '' +
        '<div class="bag"><strong>Hearts</strong><div class="token-row">' + hearts + "</div></div>" +
        '<div class="tray-scroll">' + level.cards.map(function (card) {
          return '<button type="button" class="token-btn" data-action="bag-card" data-token="' + card.id + '"><span class="gate-kid">' + card.name + "</span></button>";
        }).join("") + "</div>";
    } else if (level.kind === "loop") {
      var prints = "";
      for (var p = 0; p < 6; p++) {
        prints += '<i class="print' + (p < level.target ? " want" : "") + '" id="print-' + p + '"></i>';
      }
      body = '' +
        '<div class="prints" id="prints">' + prints + "</div>" +
        '<div class="stepper">' +
          '<button type="button" data-action="loop-dec" aria-label="Fewer">−</button>' +
          '<strong class="big-num" id="loop-n">' + state.loopN + "</strong>" +
          '<button type="button" data-action="loop-inc" aria-label="More">+</button>' +
          '<button type="button" class="cta" data-action="loop-go">Go</button>' +
        "</div>";
    } else if (level.kind === "spell" || level.kind === "order") {
      body = '' +
        '<p class="rule-line">Copy this</p>' +
        '<div class="wanted">' + level.recipe.map(function (id) { return '<span class="mini-token">' + icon(id) + "</span>"; }).join("") + "</div>" +
        '<div class="wanted mine">' + spellSlots(level) + "</div>" +
        '<div class="tray-scroll">' + level.tray.map(function (id) { return tokenButton(id, "token"); }).join("") + "</div>" +
        '<button type="button" class="cta" data-action="cast">' + level.cast + "</button>";
    } else if (level.kind === "boss") {
      var friend = level.locks.every(function (lock) { return state.bossLocks[lock.id]; });
      body = '' +
        '<div class="boss-layout plain">' +
          '<div class="locks">' +
            '<div class="lock' + (state.bossLocks.bag ? " open" : "") + '" id="lock-bag">' +
              "<strong>" + level.locks[0].name + "</strong>" +
              '<div class="lock-work stepper">' +
                '<button type="button" data-action="boss-bag" data-delta="-1" aria-label="Fewer hearts">−</button>' +
                '<strong id="boss-bag-n">' + state.bossBag + "</strong>" +
                '<button type="button" data-action="boss-bag" data-delta="1" aria-label="More hearts">+</button>' +
              "</div>" +
            "</div>" +
            '<div class="lock' + (state.bossLocks.loop ? " open" : "") + '" id="lock-loop">' +
              "<strong>" + level.locks[1].name + "</strong>" +
              '<div class="lock-work stepper">' +
                '<button type="button" data-action="boss-loop" data-delta="-1" aria-label="Fewer roars">−</button>' +
                '<strong id="boss-loop-n">' + state.bossLoop + "</strong>" +
                '<button type="button" data-action="boss-loop" data-delta="1" aria-label="More roars">+</button>' +
                '<button type="button" data-action="boss-roar">Go</button>' +
              "</div>" +
            "</div>" +
            '<div class="lock' + (state.bossLocks.spell ? " open" : "") + '" id="lock-spell">' +
              "<strong>" + level.locks[2].name + "</strong>" +
              '<div class="lock-work stepper">' +
                '<button type="button" data-action="boss-spell" data-token="shield">' + icon("block") + " Shield</button>" +
                '<button type="button" data-action="boss-spell" data-token="nap">' + icon("nap") + " Nap</button>" +
              "</div>" +
            "</div>" +
          "</div>" +
        "</div>";
    }
    var mood = state.phase === "success" ? "cheer" : (state.phase === "fail" ? "think" : "");
    return '' +
      '<section class="play quest">' +
        topBar(level.title) +
        talkBar(speechText(), mood) +
        '<div class="quest-stage">' + body + "</div>" +
        '<div class="play-actions">' +
          '<button type="button" class="ghost" id="retry" data-action="retry" hidden>Try again</button>' +
          '<button type="button" class="cta" id="next" data-action="next" hidden>Onward</button>' +
        "</div>" +
        grownupsPanel() +
      "</section>";
  }

  function pickHTML() {
    var level = currentLevel();
    var prompt = level.prompts[Math.min(state.promptAt, level.prompts.length - 1)];
    var mood = state.phase === "success" ? "cheer" : (state.phase === "fail" ? "think" : "");
    var cards = level.choices.map(function (id) {
      var item = GATES[id];
      return '<button type="button" class="gate-card pick-card" style="--wax:' + item.color + '" data-gate="' + id + '" data-action="pick-gate">' +
        '<span class="gate-draw">' + gateArt(id) + "</span>" +
        '<span class="gate-kid">' + item.kid + "</span>" +
        '<span class="gate-name">' + item.name + "</span></button>";
    }).join("");
    var tap = level.choices.map(function (id) { return GATES[id].kid; }).join(" or ");
    return '' +
      '<section class="play quest">' +
        topBar(level.title) +
        talkBar(speechText(), mood) +
        '<div class="quest-stage">' +
          '<p class="rule-line">Picture ' + (state.promptAt + 1) + " / " + level.prompts.length + "</p>" +
          '<div class="comic pick-pic' + (state.shake ? " shake" : "") + '" id="pick-pic">' +
            '<span class="mini-ins">' + prompt.in.map(function (on, k) { return miniBtn(level.inputs[k], on); }).join("") + "</span>" +
            arrow() +
            '<span class="mini-lamp' + (prompt.out ? " on" : "") + '"></span>' +
          "</div>" +
        "</div>" +
        '<p class="tray-label">Tap ' + tap + "</p>" +
        '<div class="tray-scroll pick-tray">' + cards + "</div>" +
        '<div class="play-actions">' +
          '<button type="button" class="cta" id="next" data-action="next"' + (state.phase === "success" ? "" : " hidden") + ">Onward</button>" +
        "</div>" +
        grownupsPanel() +
      "</section>";
  }

  function wakeHTML() {
    var level = currentLevel();
    var heard = state.phase === "success";
    var countLabel = (state.levelIndex + 1) + " / " + LEVELS.length;
    return '' +
      '<section class="play wake">' +
        '<header class="top">' +
          '<button type="button" class="ghost" data-action="map">Path</button>' +
          '<div class="top-title"><strong>' + level.title + '</strong><span class="count">' + countLabel + "</span></div>" +
          '<div class="top-actions"><div class="stars" id="star-row">' + starRow() + "</div>" +
          '<button type="button" class="icon-btn" id="mute" data-action="mute" aria-label="Sound">' + (store.data.muted ? "🔇" : "🔊") + "</button>" +
          '<button type="button" class="tiny" data-action="grownups">Grownups</button></div>' +
        "</header>" +
        talkBar(heard ? level.yay : level.speech, heard ? "cheer" : "") +
        '<div class="click-stage">' +
          '<button type="button" class="big-click' + (heard ? " done" : "") + '" data-action="wake-click"' + (heard ? ' aria-pressed="true"' : "") + ">Click</button>" +
          '<div class="wake-wire' + (heard ? " on" : "") + '" aria-hidden="true"><i></i><i></i><i></i></div>' +
          '<div class="lamp' + (heard ? " on" : "") + '" aria-label="' + (heard ? "The lamp is on" : "The lamp is off") + '">' + lampGraphic() + '<span class="lamp-name">Lamp</span></div>' +
        "</div>" +
        '<div class="play-actions">' +
          '<button type="button" class="cta" id="next" data-action="next"' + (heard ? "" : " hidden") + ">Onward</button>" +
        "</div>" +
        grownupsPanel() +
      "</section>";
  }

  function render() {
    if (!screenEl) return;
    if (state.screen === "play") {
      var kind = currentLevel().kind;
      if (kind === "wake") {
        lastKey = "";
        screenEl.innerHTML = wakeHTML();
        narrateCurrent();
        return;
      }
      if (kind === "tale") {
        lastKey = "";
        screenEl.innerHTML = taleHTML();
        narrateCurrent();
        return;
      }
      if (kind === "pick") {
        lastKey = "";
        screenEl.innerHTML = pickHTML();
        paint();
        return;
      }
      if (kind === "bags" || kind === "loop" || kind === "spell" || kind === "order" || kind === "boss") {
        lastKey = "";
        lampWasOn = false;
        screenEl.innerHTML = questHTML();
        paint();
        return;
      }
      mountPlay();
      lampWasOn = wireModel().output;
      paint();
      layoutWires(state.phase === "drawing");
      return;
    }
    lastKey = "";
    if (state.screen === "map") screenEl.innerHTML = mapHTML();
    else if (state.screen === "done") screenEl.innerHTML = doneHTML();
    else screenEl.innerHTML = homeHTML();
    var sparky = document.getElementById("sparky");
    if (sparky && state.screen === "done") sparky.classList.add("cheer");
    narrateCurrent();
  }

  function mountPlay() {
    lastKey = "";
    var level = currentLevel();
    var count = activeInputs().length;
    if (state.inputs.length !== count) {
      var next = state.inputs.slice(0, count);
      while (next.length < count) next.push(false);
      state.inputs = next;
    }
    screenEl.innerHTML = playHTML();
  }

  function paint() {
    if (state.screen !== "play") return;
    var level = currentLevel();
    var model = wireModel();
    var speech = document.getElementById("speech");
    if (speech && speech.textContent !== speechText()) speech.textContent = speechText();
    var sparky = document.getElementById("sparky");
    if (sparky) {
      sparky.classList.toggle("cheer", state.phase === "success");
      sparky.classList.toggle("think", state.phase === "fail");
    }
    activeInputs().forEach(function (input, i) {
      var button = document.getElementById("btn-" + i);
      if (!button) return;
      var on = !!state.inputs[i];
      button.classList.toggle("on", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
      button.setAttribute("aria-label", controlLabel(input, on));
      var bit = button.querySelector(".bit");
      if (bit) {
        bit.hidden = !store.data.bits;
        bit.textContent = on ? "1" : "0";
      }
    });
    if (!level.sandbox && level.rows) {
      level.rows.forEach(function (row, i) {
        var comic = document.getElementById("comic-" + i);
        if (!comic) return;
        var flags = comicFlags(i, row);
        comic.classList.toggle("live", flags.live);
        comic.classList.toggle("good", flags.good);
        comic.classList.toggle("bad", flags.bad);
        if (state.shake && flags.bad) comic.classList.add("shake");
      });
    }
    document.querySelectorAll("[data-gate]").forEach(function (card) {
      var selected = card.getAttribute("data-gate") === state.placed;
      card.classList.toggle("selected", selected);
      card.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    var next = document.getElementById("next");
    if (next) next.hidden = state.phase !== "success" || !!level.sandbox;
    var tryButton = document.getElementById("let-try");
    if (tryButton) tryButton.hidden = state.phase !== "demo" && state.phase !== "drawing";
    var watch = document.getElementById("watch");
    if (watch) watch.hidden = !!level.sandbox || !state.placed || state.phase === "demo" || state.phase === "drawing";
    var retry = document.getElementById("retry");
    if (retry) retry.hidden = state.phase !== "fail";
    var coach = document.getElementById("coach");
    if (coach) {
      coach.hidden = !(store.data.coach && state.phase === "pick" && !state.placed && !level.sandbox && level.id === "copy-cat");
    }
    var mute = document.getElementById("mute");
    if (mute) mute.textContent = store.data.muted ? "🔇" : "🔊";
    var stars = document.getElementById("star-row");
    if (stars && !level.sandbox) stars.innerHTML = starRow();
    var lamp = document.getElementById("lamp");
    if (lamp) {
      lamp.classList.toggle("on", model.output);
      lamp.setAttribute("aria-label", model.output ? "The lamp is on" : "The lamp is off");
    }
    var lampBit = document.getElementById("lamp-bit");
    if (lampBit) {
      lampBit.hidden = !store.data.bits || !state.placed || state.phase === "drawing";
      lampBit.textContent = model.output ? "1" : "0";
    }
    var slot = document.getElementById("slot");
    if (slot) {
      slot.classList.toggle("flow", model.flow);
      slot.classList.toggle("born", model.born);
      slot.classList.toggle("blocked", model.blocked);
    }
    paintExistingWires(model);
    if (model.output !== lampWasOn) {
      if (model.output) audio.ding();
      else audio.tick();
      lampWasOn = model.output;
    }
    applyPortrait();
    narrateCurrent();
  }

  function applyPortrait() {
    var img = document.querySelector(".talk .manga-face");
    if (!img) return;
    var mood = state.phase === "success" ? "cheer" : (state.phase === "fail" ? "think" : "");
    var next = portraitFile(mood, "hridhaan");
    if (img.getAttribute("src") !== next) img.setAttribute("src", next);
  }

  function paintExistingWires(model) {
    model.wires.forEach(function (wire) {
      var group = document.querySelector('.spark-path[data-id="' + wire.id + '"]');
      if (!group) return;
      group.style.color = wire.color;
      group.style.setProperty("--wire", wire.color);
      group.querySelectorAll(".wire-core, .wire-glow").forEach(function (path) {
        path.classList.toggle("hot", wire.hot);
      });
    });
  }

  function rel(el, stage) {
    var a = el.getBoundingClientRect();
    var b = stage.getBoundingClientRect();
    return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
  }

  function sketchPath(x1, y1, x2, y2, seed) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len;
    var ny = dx / len;
    var d = "M " + x1.toFixed(1) + " " + y1.toFixed(1);
    var steps = 7;
    for (var i = 1; i <= steps; i++) {
      var t = i / steps;
      var envelope = Math.sin(Math.PI * t);
      var wob = envelope * (Math.sin(seed * 3.1 + i * 1.7) * 7 + Math.sin(seed * 8.2 + i) * 3);
      var x = x1 + dx * t + nx * wob;
      var y = y1 + dy * t + ny * wob;
      d += " L " + x.toFixed(1) + " " + y.toFixed(1);
    }
    return d;
  }

  function layoutWires(draw) {
    var stage = document.getElementById("stage");
    var svg = document.getElementById("wires");
    if (!stage || !svg) return;
    var model = wireModel();
    var box = stage.getBoundingClientRect();
    if (box.width < 8 || box.height < 8) return;
    var round = function (n) { return Math.round(n / 2) * 2; };
    var geos = [];
    for (var i = 0; i < model.wires.length; i++) {
      var wire = model.wires[i];
      var from = document.getElementById(wire.from);
      var to = document.getElementById(wire.to);
      if (!from || !to) return;
      var p1 = rel(from, stage);
      var p2 = rel(to, stage);
      geos.push({ wire: wire, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    }
    var key = geos.map(function (g) {
      return [g.wire.id, g.wire.dashed ? 1 : 0, round(g.x1), round(g.y1), round(g.x2), round(g.y2)].join(":");
    }).join("|");
    if (key === lastKey) {
      paintExistingWires(model);
      return;
    }
    lastKey = key;
    svg.setAttribute("viewBox", "0 0 " + box.width + " " + box.height);
    svg.setAttribute("width", String(box.width));
    svg.setAttribute("height", String(box.height));
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    geos.forEach(function (g) {
      var d = sketchPath(g.x1, g.y1, g.x2, g.y2, g.wire.seed + state.levelIndex);
      var group = document.createElementNS(NS, "g");
      group.setAttribute("class", "spark-path");
      group.setAttribute("data-id", g.wire.id);
      group.style.color = g.wire.color;
      group.style.setProperty("--wire", g.wire.color);
      var glow = document.createElementNS(NS, "path");
      var core = document.createElementNS(NS, "path");
      glow.setAttribute("d", d);
      core.setAttribute("d", d);
      glow.setAttribute("class", "wire-glow" + (g.wire.hot ? " hot" : "") + (g.wire.dashed ? " dashed" : ""));
      core.setAttribute("class", "wire-core" + (g.wire.hot ? " hot" : "") + (g.wire.dashed ? " dashed" : ""));
      var sparks = document.createElementNS(NS, "g");
      sparks.setAttribute("class", "sparks");
      var nubA = document.createElementNS(NS, "circle");
      var nubB = document.createElementNS(NS, "circle");
      nubA.setAttribute("class", "nub");
      nubB.setAttribute("class", "nub");
      nubA.setAttribute("cx", g.x1.toFixed(1));
      nubA.setAttribute("cy", g.y1.toFixed(1));
      nubB.setAttribute("cx", g.x2.toFixed(1));
      nubB.setAttribute("cy", g.y2.toFixed(1));
      nubA.setAttribute("r", "6");
      nubB.setAttribute("r", "6");
      group.appendChild(glow);
      group.appendChild(core);
      group.appendChild(nubA);
      group.appendChild(nubB);
      group.appendChild(sparks);
      svg.appendChild(group);
      if (draw && !g.wire.dashed && !reduced) {
        var length = 0;
        try { length = core.getTotalLength(); } catch (err) { length = 0; }
        if (length) {
          core.style.strokeDasharray = String(length);
          glow.style.strokeDasharray = String(length);
          core.style.strokeDashoffset = String(length);
          glow.style.strokeDashoffset = String(length);
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              core.style.transition = "stroke-dashoffset .75s ease";
              glow.style.transition = "stroke-dashoffset .75s ease";
              core.style.strokeDashoffset = "0";
              glow.style.strokeDashoffset = "0";
            });
          });
        }
      }
    });
  }

  function stepSparks(dt) {
    document.querySelectorAll(".spark-path").forEach(function (group) {
      var core = group.querySelector(".wire-core");
      var layer = group.querySelector(".sparks");
      if (!core || !layer) return;
      var hot = core.classList.contains("hot");
      var parts = sparkState.get(group);
      if (!parts) {
        parts = [0.05, 0.38, 0.7].map(function (t) { return { t: t }; });
        sparkState.set(group, parts);
        parts.forEach(function () {
          var dot = document.createElementNS(NS, "circle");
          dot.setAttribute("class", "spark");
          dot.setAttribute("r", "5");
          layer.appendChild(dot);
        });
      }
      var length = 0;
      try { length = core.getTotalLength(); } catch (err) { return; }
      if (!length) return;
      var dots = layer.querySelectorAll("circle");
      parts.forEach(function (part, index) {
        if (hot && !reduced) part.t = (part.t + dt * 0.48) % 1;
        var point = core.getPointAtLength(length * part.t);
        var dot = dots[index];
        if (!dot) return;
        dot.setAttribute("cx", point.x.toFixed(1));
        dot.setAttribute("cy", point.y.toFixed(1));
        dot.setAttribute("r", (4.2 + Math.sin(part.t * Math.PI) * 1.6).toFixed(2));
        dot.style.opacity = hot ? "1" : "0";
      });
    });
  }

  function loop(now) {
    if (!loop.last) loop.last = now;
    var dt = Math.min(0.05, (now - loop.last) / 1000);
    loop.last = now;
    if (!document.hidden) {
      stepSparks(dt || 0.016);
      audio.pump();
    }
    requestAnimationFrame(loop);
  }

  function cancelDemo() {
    state.running = false;
    demoToken += 1;
    waiters.forEach(function (waiter) {
      clearTimeout(waiter.timer);
      waiter.resolve(false);
    });
    waiters = [];
  }

  function wait(ms, token) {
    return new Promise(function (resolve) {
      var timer = setTimeout(function () {
        waiters = waiters.filter(function (waiter) { return waiter.token !== token; });
        resolve(true);
      }, ms);
      waiters.push({ timer: timer, resolve: resolve, token: token });
    });
  }

  function confetti() {
    if (reduced) return;
    var pad = document.querySelector(".pad");
    if (!pad) return;
    var colors = ["#ef3b3b", "#ff8a1e", "#ffd23a", "#2fbe5a", "#3a86ff", "#8b5cff", "#ff5d9a"];
    for (var i = 0; i < 26; i++) {
      var bit = document.createElement("i");
      bit.className = "shaving";
      bit.style.left = Math.random() * 100 + "%";
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = Math.random() * 0.15 + "s";
      bit.style.transform = "rotate(" + Math.round(Math.random() * 80) + "deg)";
      pad.appendChild(bit);
      setTimeout(function (node) { node.remove(); }, 1300, bit);
    }
  }

  function remember() {
    if (previewing) return;
    if (state.sandbox) store.data.place = { screen: "pad" };
    else if (state.screen === "play") store.data.place = { screen: "play", levelIndex: state.levelIndex, reviewing: !!state.reviewing };
    else store.data.place = { screen: state.screen };
    store.save();
  }

  function restorePlace() {
    var place = store.data.place;
    if (!place || typeof place.screen !== "string") return false;
    if (place.screen === "play") {
      var index = Number(place.levelIndex);
      if (!LEVELS[index]) return false;
      beginLevel(index, !!place.reviewing);
      return true;
    }
    if (place.screen === "pad") {
      beginPad();
      return true;
    }
    if (place.screen === "map" || place.screen === "done") {
      state.screen = place.screen;
    }
    return false;
  }

  function resetProgress() {
    var earned = earnedCount();
    var message = earned
      ? "Reset progress? This erases " + earned + " saved page" + (earned === 1 ? "" : "s") + " and starts the path over."
      : "Reset progress? This clears the saved place and starts the path over.";
    if (!window.confirm(message)) return;
    cancelDemo();
    store.data.stars = {};
    store.data.reviewDue = false;
    store.data.reviewAt = 0;
    store.data.place = { screen: "home" };
    store.save();
    state.grownups = false;
    state.sandbox = false;
    state.note = "";
    state.screen = "home";
    state.levelIndex = 0;
    render();
  }

  function markSuccess() {
    var level = currentLevel();
    var first = !store.data.stars[level.id];
    store.data.stars[level.id] = true;
    remember();
    state.phase = "success";
    state.shake = false;
    paint();
    if (first || state.reviewing) {
      audio.win();
      confetti();
    }
  }

  async function runDemo() {
    var token = ++demoToken;
    var level = currentLevel();
    if (!state.placed || level.sandbox) return;
    state.phase = "drawing";
    state.demoRow = -1;
    paint();
    var drew = await wait(760, token);
    if (!drew || token !== demoToken || state.screen !== "play") return;
    for (var i = 0; i < level.rows.length; i++) {
      state.demoRow = i;
      state.inputs = level.rows[i].in.slice();
      state.phase = "demo";
      paint();
      var ok = GATES[state.placed].run(state.inputs) === level.rows[i].out;
      var still = await wait(1500, token);
      if (!still || token !== demoToken || state.screen !== "play") return;
      if (!ok) {
        state.phase = "fail";
        state.shake = true;
        paint();
        state.shake = false;
        audio.nope();
        return;
      }
    }
    markSuccess();
  }

  function beginLevel(index, reviewing) {
    cancelDemo();
    state.reviewing = !!reviewing;
    state.sandbox = false;
    state.screen = "play";
    state.levelIndex = index;
    state.grownups = false;
    state.note = "";
    state.promptAt = 0;
    state.promptLine = "";
    var level = LEVELS[index];
    state.replaying = !!(level && store.data.stars[level.id]);
    state.inputs = (level.inputs || []).map(function () { return false; });
    state.placed = null;
    state.phase = "pick";
    state.demoRow = -1;
    state.panel = 0;
    state.bags = copyBag(level && level.start);
    state.loopN = 1;
    state.spell = [];
    state.runHead = -1;
    state.bossBag = 0;
    state.bossLoop = 1;
    state.bossLocks = {};
    state.running = false;
    remember();
    render();
  }

  function finishReview() {
    store.data.reviewDue = false;
    store.data.reviewAt = (store.data.reviewAt || 0) + 1;
    state.reviewing = false;
    store.save();
    if (allEarned()) showScreen("map");
    else beginLevel(continueIndex());
  }

  function goOnward() {
    if (state.reviewing) {
      finishReview();
      return;
    }
    if (shouldOfferReview()) {
      offerReview();
      return;
    }
    var index = state.levelIndex + 1;
    if (!state.replaying) {
      while (index < LEVELS.length && store.data.stars[LEVELS[index].id]) index += 1;
    }
    if (index >= LEVELS.length) showScreen(allEarned() ? "done" : "map");
    else beginLevel(index);
  }

  function beginPad() {
    cancelDemo();
    state.reviewing = false;
    state.sandbox = true;
    state.screen = "play";
    state.levelIndex = -1;
    state.grownups = false;
    state.inputs = [false];
    state.placed = null;
    state.phase = "pick";
    remember();
    render();
  }

  function choosePick(id) {
    var level = currentLevel();
    if (!level || level.kind !== "pick" || state.phase === "success") return;
    var prompt = level.prompts[state.promptAt];
    if (!prompt) return;
    audio.unlock();
    if (id !== prompt.answer) {
      state.phase = "fail";
      state.shake = true;
      audio.nope();
      render();
      state.shake = false;
      return;
    }
    var seen = 0;
    for (var i = 0; i <= state.promptAt; i++) {
      if (level.prompts[i].answer === id) seen += 1;
    }
    if (state.promptAt >= level.prompts.length - 1) {
      markSuccess();
      return;
    }
    state.promptAt += 1;
    state.phase = "pick";
    state.promptLine = seen >= 2 ? "Yes. You pulled that one back again." : "Yes. Next picture.";
    audio.ding();
    render();
  }

  function placeGate(id) {
    var level = currentLevel();
    if (level.kind === "pick") return;
    if (!GATES[id]) return;
    if (level.choices.indexOf(id) === -1) return;
    audio.unlock();
    audio.place();
    cancelDemo();
    store.data.coach = false;
    remember();
    state.placed = id;
    if (level.sandbox) {
      var count = GATES[id].inputs;
      var next = state.inputs.slice(0, count);
      while (next.length < count) next.push(false);
      state.inputs = next;
      state.phase = "play";
      render();
      return;
    }
    state.phase = "drawing";
    render();
    runDemo();
  }

  function toggle(index) {
    if (state.screen !== "play") return;
    if (state.phase === "demo" || state.phase === "drawing") return;
    if (index >= state.inputs.length) return;
    audio.unlock();
    state.inputs[index] = !state.inputs[index];
    audio.pop();
    paint();
  }

  function previewRow(index) {
    if (state.phase === "demo" || state.phase === "drawing") return;
    var level = currentLevel();
    if (level.sandbox || !level.rows[index]) return;
    state.inputs = level.rows[index].in.slice();
    audio.pop();
    paint();
  }

  function letMeTry() {
    var level = currentLevel();
    cancelDemo();
    if (!state.placed || level.sandbox) return;
    if (gateMatches(level, state.placed)) {
      var row = level.rows.slice().reverse().find(function (item) { return item.out; });
      if (row) state.inputs = row.in.slice();
      markSuccess();
      return;
    }
    state.phase = "fail";
    state.shake = true;
    var bad = level.rows.find(function (item) { return GATES[state.placed].run(item.in) !== item.out; });
    if (bad) state.inputs = bad.in.slice();
    paint();
    state.shake = false;
    audio.nope();
  }

  function showScreen(name) {
    cancelDemo();
    state.reviewing = false;
    state.screen = name;
    state.grownups = false;
    state.sandbox = false;
    remember();
    render();
  }

  var gateDrag = null;
  var ignoreGateClick = false;

  function hitSlot(x, y) {
    var slot = document.getElementById("slot");
    if (!slot) return false;
    var rect = slot.getBoundingClientRect();
    var pad = 36;
    return x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad;
  }

  function moveGhost(id, x, y) {
    var ghost = document.getElementById("gate-ghost");
    if (!ghost) {
      ghost = document.createElement("div");
      ghost.id = "gate-ghost";
      ghost.className = "gate-ghost";
      document.body.appendChild(ghost);
    }
    if (ghost.getAttribute("data-gate") !== id) {
      var item = GATES[id];
      ghost.setAttribute("data-gate", id);
      ghost.style.setProperty("--wax", item.color);
      ghost.innerHTML = '<span class="gate-draw">' + gateArt(id) + '</span><span class="gate-kid">' + item.kid + '</span><span class="gate-name">' + item.name + "</span>";
    }
    ghost.classList.add("show");
    ghost.style.left = x + "px";
    ghost.style.top = y + "px";
  }

  function clearGhost() {
    var ghost = document.getElementById("gate-ghost");
    if (ghost) ghost.classList.remove("show");
    var slot = document.getElementById("slot");
    if (slot) slot.classList.remove("drop-ready");
  }

  function onGatePointerDown(event) {
    if (event.button > 0) return;
    var card = event.target.closest("[data-gate]");
    if (!card || state.screen !== "play") return;
    var level = currentLevel();
    if (!level || level.kind === "wake" || level.kind === "pick") return;
    gateDrag = {
      id: card.getAttribute("data-gate"),
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      card: card
    };
    try { card.setPointerCapture(event.pointerId); } catch (err) { /* older browsers */ }
  }

  function onGatePointerMove(event) {
    if (!gateDrag || event.pointerId !== gateDrag.pointerId) return;
    var dx = event.clientX - gateDrag.x;
    var dy = event.clientY - gateDrag.y;
    if (!gateDrag.moved) {
      if (dx * dx + dy * dy < 256) return;
      gateDrag.moved = true;
      gateDrag.card.classList.add("dragging");
    }
    event.preventDefault();
    moveGhost(gateDrag.id, event.clientX, event.clientY);
    var slot = document.getElementById("slot");
    if (slot) slot.classList.toggle("drop-ready", hitSlot(event.clientX, event.clientY));
  }

  function onGatePointerUp(event) {
    if (!gateDrag || event.pointerId !== gateDrag.pointerId) return;
    var info = gateDrag;
    gateDrag = null;
    info.card.classList.remove("dragging");
    var drop = info.moved && hitSlot(event.clientX, event.clientY);
    clearGhost();
    ignoreGateClick = true;
    setTimeout(function () { ignoreGateClick = false; }, 500);
    if (drop || !info.moved) placeGate(info.id);
  }

  function bagsMatch() {
    var goal = currentLevel().goal || {};
    return Object.keys(goal).every(function (key) { return state.bags[key] === goal[key]; });
  }

  function changeBag(id, delta) {
    var level = currentLevel();
    if (level.kind !== "bags" || level.mode !== "count") return;
    if (state.phase === "success") return;
    state.phase = "pick";
    state.bags[id] = Math.max(0, Math.min(5, (state.bags[id] || 0) + delta));
    audio.pop();
    render();
    if (bagsMatch()) markSuccess();
  }

  function applyCard(id) {
    var level = currentLevel();
    if (level.kind !== "bags" || state.phase === "success") return;
    var card = (level.cards || []).filter(function (item) { return item.id === id; })[0];
    if (!card) return;
    state.bags.hearts = Math.max(0, (level.start.hearts || 0) + card.delta);
    if (bagsMatch()) {
      render();
      markSuccess();
    } else {
      state.phase = "fail";
      audio.nope();
      render();
    }
  }

  async function runLoop() {
    var level = currentLevel();
    if (level.kind !== "loop" || state.running || state.phase === "success") return;
    state.running = true;
    state.phase = "pick";
    var token = ++demoToken;
    paint();
    document.querySelectorAll(".print").forEach(function (node) { node.classList.remove("on"); });
    var n = state.loopN;
    for (var i = 0; i < n; i++) {
      var still = await wait(260, token);
      if (!still || state.screen !== "play") return;
      var print = document.getElementById("print-" + i);
      if (print) print.classList.add("on");
      audio.pop();
    }
    state.running = false;
    if (n === level.target) markSuccess();
    else {
      state.phase = "fail";
      audio.nope();
      paint();
    }
  }

  function pushToken(id) {
    var level = currentLevel();
    if (state.phase === "success" || state.running) return;
    if (!level.recipe || state.spell.length >= level.recipe.length) return;
    state.phase = "pick";
    state.runHead = -1;
    state.spell.push(id);
    audio.pop();
    render();
  }

  async function runOrder() {
    var level = currentLevel();
    if (state.running || state.phase === "success") return;
    state.running = true;
    state.phase = "pick";
    var token = ++demoToken;
    for (var i = 0; i < level.recipe.length; i++) {
      state.runHead = i;
      var slots = document.querySelectorAll(".slot-token");
      for (var s = 0; s < slots.length; s++) slots[s].classList.toggle("run", s === i);
      var still = await wait(320, token);
      if (!still || state.screen !== "play") return;
      if (state.spell[i] !== level.recipe[i]) {
        state.running = false;
        state.phase = "fail";
        audio.nope();
        paint();
        return;
      }
      audio.pop();
    }
    state.running = false;
    markSuccess();
  }

  function castNow() {
    var level = currentLevel();
    if (state.phase === "success" || state.running) return;
    if (level.kind === "order") {
      runOrder();
      return;
    }
    var ok = level.recipe.length === state.spell.length && level.recipe.every(function (id, i) { return state.spell[i] === id; });
    if (ok) markSuccess();
    else {
      state.phase = "fail";
      audio.nope();
      paint();
    }
  }

  function openLock(id) {
    if (state.bossLocks[id] || state.phase === "success") return;
    state.bossLocks[id] = true;
    var node = document.getElementById("lock-" + id);
    if (node) node.classList.add("open");
    audio.ding();
    var level = currentLevel();
    var done = level.locks.every(function (lock) { return state.bossLocks[lock.id]; });
    if (!done) {
      if (state.phase === "fail") state.phase = "pick";
      paint();
      return;
    }
    var dragon = document.getElementById("dragon");
    if (dragon) {
      if (dragon.tagName === "IMG") dragon.src = "art/blaze-friend.jpg";
      dragon.classList.remove("mad");
      dragon.classList.add("friend");
    }
    markSuccess();
  }

  function retryPuzzle() {
    var level = currentLevel();
    state.phase = "pick";
    state.runHead = -1;
    state.running = false;
    if (level.kind === "spell" || level.kind === "order") state.spell = [];
    if (level.kind === "bags" && level.start) state.bags = copyBag(level.start);
    render();
  }

  function finishTale() {
    var level = currentLevel();
    if (state.panel < level.panels.length - 1) {
      state.panel += 1;
      audio.page();
      render();
      return;
    }
    var first = !store.data.stars[level.id];
    store.data.stars[level.id] = true;
    remember();
    if (first) audio.hello();
    goOnward();
  }

  function openLand(id) {
    var levels = chapterLevels(id);
    var cleared = levels.every(function (level) { return store.data.stars[level.id]; });
    var index = LEVELS.findIndex(function (level) {
      return level.chapter === id && (cleared || !store.data.stars[level.id]);
    });
    if (index >= 0) beginLevel(index);
  }

  function onClick(event) {
    var gate = event.target.closest("[data-gate]");
    if (gate) {
      if (currentLevel() && currentLevel().kind === "pick") {
        choosePick(gate.getAttribute("data-gate"));
        return;
      }
      if (ignoreGateClick) return;
      placeGate(gate.getAttribute("data-gate"));
      return;
    }
    var el = event.target.closest("[data-action]");
    if (!el) return;
    if (el.getAttribute("data-action") === "hear") {
      audio.unlock();
      var heard = lineNow();
      lastSaid = "";
      voice.say(heard.text, heard.who);
      lastSaid = heard.text;
      return;
    }
    var action = el.getAttribute("data-action");
    if (action === "pick-gate") {
      choosePick(el.getAttribute("data-gate"));
      return;
    }
    if (action === "open") {
      audio.unlock();
      audio.hello();
      state.note = "";
      showScreen("map");
      return;
    }
    if (action === "map") { showScreen("map"); return; }
    if (action === "home") { showScreen("home"); return; }
    if (action === "done") { showScreen("done"); return; }
    if (action === "pad") { beginPad(); return; }
    if (action === "continue") {
      state.note = "";
      beginLevel(continueIndex());
      return;
    }
    if (action === "level") { beginLevel(Number(el.getAttribute("data-level") || 0)); return; }
    if (action === "wake-click") {
      var wake = currentLevel();
      if (!wake || wake.kind !== "wake" || state.phase === "success") return;
      audio.unlock();
      audio.pop();
      state.phase = "success";
      var firstWake = !store.data.stars[wake.id];
      store.data.stars[wake.id] = true;
      remember();
      render();
      if (firstWake) {
        audio.win();
        confetti();
      }
      return;
    }
    if (action === "toggle") { toggle(Number(el.getAttribute("data-index"))); return; }
    if (action === "row") { previewRow(Number(el.getAttribute("data-row"))); return; }
    if (action === "try") { letMeTry(); return; }
    if (action === "watch") {
      if (!state.placed || state.sandbox) return;
      cancelDemo();
      state.phase = "drawing";
      render();
      runDemo();
      return;
    }
    if (action === "next") { goOnward(); return; }
    if (action === "tale-next") { finishTale(); return; }
    if (action === "land") { openLand(el.getAttribute("data-chapter")); return; }
    if (action === "locked") {
      state.note = "Finish the page before this one.";
      state.screen = "map";
      render();
      return;
    }
    if (action === "bag-add") { changeBag(el.getAttribute("data-bag"), 1); return; }
    if (action === "bag-sub") { changeBag(el.getAttribute("data-bag"), -1); return; }
    if (action === "bag-card") { applyCard(el.getAttribute("data-token")); return; }
    if (action === "loop-inc") {
      if (state.phase === "success" || state.running) return;
      state.loopN = Math.min(6, state.loopN + 1);
      var more = document.getElementById("loop-n");
      if (more) more.textContent = String(state.loopN);
      audio.pop();
      return;
    }
    if (action === "loop-dec") {
      if (state.phase === "success" || state.running) return;
      state.loopN = Math.max(1, state.loopN - 1);
      var less = document.getElementById("loop-n");
      if (less) less.textContent = String(state.loopN);
      audio.pop();
      return;
    }
    if (action === "loop-go") { runLoop(); return; }
    if (action === "token") { pushToken(el.getAttribute("data-token")); return; }
    if (action === "unspell") {
      if (state.phase === "success" || state.running) return;
      var at = Number(el.getAttribute("data-index"));
      if (state.spell[at]) {
        state.spell.splice(at, 1);
        state.phase = "pick";
        state.runHead = -1;
        render();
      }
      return;
    }
    if (action === "cast") { castNow(); return; }
    if (action === "retry") { retryPuzzle(); return; }
    if (action === "boss-bag") {
      if (state.bossLocks.bag || state.phase === "success") return;
      var bagDelta = Number(el.getAttribute("data-delta"));
      state.bossBag = Math.max(0, Math.min(5, state.bossBag + bagDelta));
      var bagN = document.getElementById("boss-bag-n");
      if (bagN) bagN.textContent = String(state.bossBag);
      audio.pop();
      if (state.bossBag === 2) openLock("bag");
      return;
    }
    if (action === "boss-loop") {
      if (state.bossLocks.loop || state.phase === "success") return;
      var loopDelta = Number(el.getAttribute("data-delta"));
      state.bossLoop = Math.max(1, Math.min(6, state.bossLoop + loopDelta));
      var loopN = document.getElementById("boss-loop-n");
      if (loopN) loopN.textContent = String(state.bossLoop);
      audio.pop();
      return;
    }
    if (action === "boss-roar") {
      if (state.bossLocks.loop || state.phase === "success" || state.running) return;
      if (state.bossLoop !== 3) {
        state.phase = "fail";
        audio.nope();
        paint();
        return;
      }
      audio.roar();
      openLock("loop");
      return;
    }
    if (action === "boss-spell") {
      if (state.bossLocks.spell || state.phase === "success") return;
      if (el.getAttribute("data-token") === "shield") openLock("spell");
      else {
        state.phase = "fail";
        audio.nope();
        paint();
      }
      return;
    }
    if (action === "mute") {
      store.data.muted = !store.data.muted;
      remember();
      if (!store.data.muted) {
        audio.unlock();
        audio.startMusic();
      } else {
        audio.stopMusic();
        voice.stop();
        lastSaid = "";
      }
      paint();
      var mute = document.getElementById("mute");
      if (mute && state.screen !== "play") mute.textContent = store.data.muted ? "🔇" : "🔊";
      if (state.screen !== "play") render();
      return;
    }
    if (action === "grownups") {
      state.grownups = !state.grownups;
      var panel = document.getElementById("grownups");
      if (panel) panel.hidden = !state.grownups;
      else render();
      return;
    }
    if (action === "close-grownups") {
      state.grownups = false;
      var openPanel = document.getElementById("grownups");
      if (openPanel) openPanel.hidden = true;
      return;
    }
    if (action === "reset") {
      resetProgress();
      return;
    }
    if (action === "soon") {
      var id = el.getAttribute("data-chapter");
      var chapter = CHAPTERS.filter(function (item) { return item.id === id; })[0];
      state.note = chapter ? chapter.blurb : "";
      state.screen = "map";
      render();
    }
  }

  function onKey(event) {
    audio.unlock();
    audio.startMusic();
    if (event.key === "Escape") {
      if (state.grownups) {
        state.grownups = false;
        var panel = document.getElementById("grownups");
        if (panel) panel.hidden = true;
        return;
      }
      if (state.screen === "play") showScreen("map");
      return;
    }
    if (state.screen !== "play") return;
    if (event.key === "1") toggle(0);
    if (event.key === "2") toggle(1);
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      var choices = currentLevel().choices;
      if (!choices || !choices.length) return;
      var at = choices.indexOf(state.placed);
      var step = event.key === "ArrowRight" ? 1 : -1;
      var next = choices[(at + step + choices.length) % choices.length];
      placeGate(next);
    }
  }

  function onChange(event) {
    if (event.target.id !== "bits") return;
    store.data.bits = !!event.target.checked;
    remember();
    if (state.screen === "play") paint();
  }

  function applyPreview() {
    var q = new URLSearchParams(location.search);
    if (!q.has("preview")) return false;
    previewing = true;
    if (q.get("bits") === "1") store.data.bits = true;
    var mode = q.get("preview");
    if (mode === "map") { state.screen = "map"; render(); return true; }
    if (mode === "done") {
      LEVELS.forEach(function (level) { store.data.stars[level.id] = true; });
      state.screen = "done";
      render();
      return true;
    }
    if (mode === "pad") {
      beginPad();
      if (q.get("gate")) {
        cancelDemo();
        state.placed = q.get("gate");
        state.phase = "play";
        var count = GATES[state.placed].inputs;
        state.inputs = [];
        var inn = q.get("in") || "";
        for (var i = 0; i < count; i++) state.inputs.push(inn.charAt(i) === "1");
        render();
      }
      return true;
    }
    if (mode === "play") {
      var index = Number(q.get("level") || 0);
      var level = LEVELS[index];
      if (!level) return true;
      if (level.kind) {
        beginLevel(index);
        return true;
      }
      state.sandbox = false;
      state.screen = "play";
      state.levelIndex = index;
      state.inputs = (level.inputs || []).map(function () { return false; });
      state.placed = q.get("gate");
      state.phase = q.get("phase") || (state.placed ? "success" : "pick");
      if (q.get("in")) state.inputs = q.get("in").split("").map(function (ch) { return ch === "1"; });
      else if (state.placed) {
        var lit = level.rows.slice().reverse().find(function (row) { return row.out; });
        if (lit) state.inputs = lit.in.slice();
      }
      render();
      return true;
    }
    return false;
  }

  function boot() {
    screenEl = document.getElementById("screen");
    store.load();
    screenEl.addEventListener("click", onClick);
    screenEl.addEventListener("pointerdown", onGatePointerDown);
    document.addEventListener("pointermove", onGatePointerMove, { passive: false });
    document.addEventListener("pointerup", onGatePointerUp);
    document.addEventListener("pointercancel", onGatePointerUp);
    screenEl.addEventListener("change", onChange);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", function () {
      audio.unlock();
      audio.startMusic();
    });
    window.addEventListener("resize", function () { if (state.screen === "play") layoutWires(false); });
    var pad = document.querySelector(".pad");
    if (window.ResizeObserver && pad) {
      var observer = new ResizeObserver(function () {
        if (state.screen === "play") layoutWires(false);
      });
      observer.observe(pad);
    }
    if (!applyPreview()) {
      stampDay();
      if (!restorePlace()) render();
      remember();
    }
    window.addEventListener("pagehide", remember);
    requestAnimationFrame(loop);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (state.screen === "play") layoutWires(false);
      });
    }
  }

  function selfCheck() {
    var problems = [];
    LEVELS.forEach(function (level) {
      if (!level.chapter) problems.push(level.id + " chapter");
      if (level.kind === "wake") return;
      if (level.kind) {
        if (level.kind === "tale" && (!level.panels || level.panels.length < 2)) problems.push(level.id + " panels");
        if (level.kind === "bags" && !level.goal) problems.push(level.id + " goal");
        if (level.kind === "loop" && !level.target) problems.push(level.id + " target");
        if ((level.kind === "spell" || level.kind === "order") && (!level.recipe || !level.tray)) problems.push(level.id + " recipe");
        if (level.kind === "boss" && (!level.locks || level.locks.length < 3)) problems.push(level.id + " locks");
        if (level.kind === "pick") {
          if (!level.prompts || level.prompts.length < 4) problems.push(level.id + " prompts");
          var counts = {};
          (level.prompts || []).forEach(function (prompt) {
            if (!prompt.in || prompt.in.length !== level.inputs.length) problems.push(level.id + " prompt width");
            if (level.choices.indexOf(prompt.answer) < 0) problems.push(level.id + " prompt answer");
            if (!GATES[prompt.answer] || GATES[prompt.answer].run(prompt.in) !== prompt.out) problems.push(level.id + " prompt match");
            var winners = level.choices.filter(function (id) { return GATES[id].run(prompt.in) === prompt.out; });
            if (winners.length !== 1) problems.push(level.id + " ambiguous");
            counts[prompt.answer] = (counts[prompt.answer] || 0) + 1;
          });
          level.choices.forEach(function (id) {
            if ((counts[id] || 0) < 2) problems.push(level.id + " needs two " + id);
          });
        }
        return;
      }
      level.rows.forEach(function (row) {
        if (row.in.length !== level.inputs.length) problems.push(level.id + " row width");
      });
      var winners = level.choices.filter(function (id) { return gateMatches(level, id); });
      if (winners.length !== 1 || winners[0] !== level.answer) problems.push(level.id + " winners " + winners.join(","));
      if (!level.rows[level.rows.length - 1].out) problems.push(level.id + " ends dark");
    });
    CHAPTERS.forEach(function (chapter) {
      if (!chapterLevels(chapter.id).length) problems.push("empty " + chapter.id);
    });
    return problems;
  }

  boot();
  var problems = selfCheck();
  if (problems.length) console.error("Sketch pad level check failed", problems);
})();
