/**
 * SoundManager.js
 * Trading-themed sound effects + haptic feedback for TraderNet.
 *
 * Sounds are synthesized via base64-encoded minimal WAV data URIs so no
 * external assets are required.  Each "trade" action maps to a distinct
 * tone pattern that experienced traders will instantly recognise.
 *
 * Haptics are provided as a graceful fallback and are always triggered
 * alongside audio for a richer tactile feel on supported devices.
 */

import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// WAV builder — creates a minimal mono 44.1 kHz 16-bit PCM WAV in memory
// ---------------------------------------------------------------------------

function buildWav(samples) {
  const numSamples = samples.length;
  const byteRate = 44100 * 1 * 2; // sampleRate * numChannels * bitsPerSample/8
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (off, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);       // chunk size
  view.setUint16(20, 1, true);        // PCM
  view.setUint16(22, 1, true);        // mono
  view.setUint32(24, 44100, true);    // sample rate
  view.setUint32(28, byteRate, true);
  view.setUint16(32, 2, true);        // block align
  view.setUint16(34, 16, true);       // bits per sample
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  // Convert to base64
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa is available in React Native >= 0.70 (Hermes engine)
  return "data:audio/wav;base64," + btoa(binary);
}

// ---------------------------------------------------------------------------
// Tone generators
// ---------------------------------------------------------------------------

const SR = 44100;

function sineWave(freq, durationMs, volume = 0.8) {
  const n = Math.floor((SR * durationMs) / 1000);
  return Array.from({ length: n }, (_, i) => {
    const t = i / SR;
    // Exponential decay envelope so it fades naturally
    const env = Math.exp(-t * (4000 / durationMs));
    return volume * env * Math.sin(2 * Math.PI * freq * t);
  });
}

function mixSamples(...arrays) {
  const len = Math.max(...arrays.map((a) => a.length));
  const out = new Array(len).fill(0);
  for (const arr of arrays) {
    for (let i = 0; i < arr.length; i++) out[i] += arr[i];
  }
  return out.map((s) => s / arrays.length);
}

function delayedSine(freq, durationMs, delayMs, volume = 0.8) {
  const delaySamples = Math.floor((SR * delayMs) / 1000);
  const tone = sineWave(freq, durationMs, volume);
  return [...new Array(delaySamples).fill(0), ...tone];
}

// ---------------------------------------------------------------------------
// Pre-build all WAVs once at module load (fast — runs synchronously)
// ---------------------------------------------------------------------------

const SOUNDS_RAW = {
  // ✅ Tab navigation — metallic terminal "tick" (two fast high tones)
  tabSwitch: buildWav(mixSamples(sineWave(1200, 60, 0.45), delayedSine(900, 60, 40, 0.3))),

  // ✅ Segment/filter change — soft digital "blip"
  segmentSwitch: buildWav(sineWave(880, 70, 0.35)),

  // ✅ Like a post — classic NYSE trading "ding" ascending chord
  like: buildWav(mixSamples(sineWave(523, 120, 0.5), delayedSine(659, 100, 60, 0.5), delayedSine(784, 90, 120, 0.5))),

  // ✅ Unlike — muted descending blip
  unlike: buildWav(mixSamples(sineWave(784, 80, 0.3), delayedSine(523, 80, 60, 0.3))),

  // ✅ Send message — quick outbound "whoosh" sweep (chirp up)
  sendMessage: buildWav(
    Array.from({ length: Math.floor(SR * 0.1) }, (_, i) => {
      const t = i / SR;
      const freq = 400 + 1200 * (i / Math.floor(SR * 0.1));
      const env = Math.exp(-t * 20);
      return 0.4 * env * Math.sin(2 * Math.PI * freq * t);
    })
  ),

  // ✅ Post published — trade execution chime (3-note ascending: C–E–G)
  postCreated: buildWav(
    mixSamples(
      sineWave(523, 200, 0.45),
      delayedSine(659, 180, 110, 0.45),
      delayedSine(784, 160, 220, 0.55)
    )
  ),

  // ✅ Comment added — soft single ding
  commentAdded: buildWav(sineWave(1047, 90, 0.4)),

  // ✅ Join/enter group — opening bell (short burst, two overlapping tones)
  joinGroup: buildWav(
    mixSamples(sineWave(440, 300, 0.5), sineWave(554, 280, 0.4), delayedSine(659, 250, 80, 0.4))
  ),

  // ✅ Error / failure — descending minor interval buzz
  error: buildWav(mixSamples(sineWave(400, 120, 0.4), delayedSine(300, 120, 60, 0.4))),

  // ✅ Logout — closing bell (descending: G–E–C)
  logout: buildWav(
    mixSamples(
      sineWave(784, 180, 0.4),
      delayedSine(659, 160, 100, 0.4),
      delayedSine(523, 200, 200, 0.45)
    )
  ),

  // ✅ Login success — "market open" ascending power chord
  loginSuccess: buildWav(
    mixSamples(
      sineWave(440, 250, 0.4),
      sineWave(550, 220, 0.35),
      delayedSine(660, 200, 120, 0.4),
      delayedSine(880, 180, 200, 0.45)
    )
  ),

  // ✅ Dark/light mode toggle — quick whoosh-click
  themeToggle: buildWav(
    mixSamples(sineWave(1100, 55, 0.3), delayedSine(750, 55, 35, 0.25))
  ),

  // ─────────────────────────────────────────────────────────────────
  // MetaTrader / Interactive Brokers / Chart-inspired sounds
  // ─────────────────────────────────────────────────────────────────

  // ✅ MT4/MT5 "Order Filled" — classic two-tone confirmation ding
  // The exact signature of a market order execution in MetaTrader
  orderFilled: buildWav(
    mixSamples(
      sineWave(660, 80, 0.5),
      delayedSine(880, 120, 70, 0.55)
    )
  ),

  // ✅ MT4 "Order Rejected" — sharp descending rejection burst
  orderRejected: buildWav(
    mixSamples(
      sineWave(440, 60, 0.5),
      delayedSine(330, 80, 50, 0.5),
      delayedSine(220, 100, 100, 0.45)
    )
  ),

  // ✅ IB Price Alert — three rapid ascending pings (alert!)
  alertTriggered: buildWav(
    mixSamples(
      sineWave(880, 55, 0.4),
      delayedSine(1047, 55, 80, 0.4),
      delayedSine(1318, 55, 160, 0.45)
    )
  ),

  // ✅ Chart Tick — ultra-short click used by tick/tick-bar charts
  // Inaudible background sound that trading terminals use as tick feedback
  chartTick: buildWav(
    Array.from({ length: Math.floor(SR * 0.018) }, (_, i) => {
      const t = i / SR;
      const env = Math.exp(-t * 350);
      return 0.22 * env * Math.sin(2 * Math.PI * 1760 * t);
    })
  ),

  // ✅ Market Open — strong NYSE-style opening bell burst
  // Rich overtone cluster, more powerful than "joinGroup"
  marketOpen: buildWav(
    mixSamples(
      sineWave(329, 350, 0.45),
      sineWave(415, 320, 0.35),
      sineWave(523, 300, 0.4),
      delayedSine(659, 280, 80, 0.45),
      delayedSine(784, 250, 160, 0.5)
    )
  ),

  // ✅ Market Close — descending end-of-session resolution
  marketClose: buildWav(
    mixSamples(
      sineWave(784, 250, 0.4),
      delayedSine(659, 230, 120, 0.38),
      delayedSine(523, 250, 230, 0.38),
      delayedSine(392, 280, 340, 0.4)
    )
  ),

  // ✅ Profit Target Hit — celebratory ascending arpeggio
  // Feels like a green candle closing above target
  profitTarget: buildWav(
    mixSamples(
      sineWave(523, 80, 0.4),
      delayedSine(659, 75, 75, 0.42),
      delayedSine(784, 70, 145, 0.44),
      delayedSine(1047, 110, 210, 0.5)
    )
  ),

  // ✅ Stop Loss Hit — sharp drop tone (red candle feel)
  // Fast descending tritone — instantly recognisable to traders
  stopLoss: buildWav(
    mixSamples(
      sineWave(523, 70, 0.45),
      delayedSine(370, 80, 60, 0.45),
      delayedSine(262, 100, 120, 0.5)
    )
  ),
};

// ---------------------------------------------------------------------------
// Cache of loaded Sound objects
// ---------------------------------------------------------------------------

const _soundCache = {};
let _muted = false;

async function _loadSound(key) {
  if (_soundCache[key]) return _soundCache[key];
  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: SOUNDS_RAW[key] },
      { shouldPlay: false, volume: 1.0 }
    );
    _soundCache[key] = sound;
    return sound;
  } catch (_) {
    return null;
  }
}

// Pre-warm cache in the background (non-blocking)
async function preload() {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: false,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });
  for (const key of Object.keys(SOUNDS_RAW)) {
    _loadSound(key);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const SoundManager = {
  /**
   * Call once on app startup to pre-warm the audio engine.
   */
  preload,

  /** Mute / unmute all sounds (haptics still fire when muted). */
  setMuted(v) {
    _muted = v;
  },

  /**
   * Play a sound + appropriate haptic feedback.
   * @param {string} soundKey — key from SOUNDS_RAW
   */
  async play(soundKey) {
    // Trigger haptic first (synchronous path, very fast)
    _hapticFor(soundKey);

    if (_muted) return;
    try {
      const sound = await _loadSound(soundKey);
      if (!sound) return;
      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch (_) {
      // Never crash on audio failure
    }
  },

  // Convenience aliases so callers don't need to remember keys:
  tabSwitch: () => SoundManager.play("tabSwitch"),
  segmentSwitch: () => SoundManager.play("segmentSwitch"),
  like: () => SoundManager.play("like"),
  unlike: () => SoundManager.play("unlike"),
  sendMessage: () => SoundManager.play("sendMessage"),
  postCreated: () => SoundManager.play("postCreated"),
  commentAdded: () => SoundManager.play("commentAdded"),
  joinGroup: () => SoundManager.play("joinGroup"),
  error: () => SoundManager.play("error"),
  logout: () => SoundManager.play("logout"),
  loginSuccess: () => SoundManager.play("loginSuccess"),
  themeToggle: () => SoundManager.play("themeToggle"),
  // MetaTrader / Chart sounds
  orderFilled: () => SoundManager.play("orderFilled"),
  orderRejected: () => SoundManager.play("orderRejected"),
  alertTriggered: () => SoundManager.play("alertTriggered"),
  chartTick: () => SoundManager.play("chartTick"),
  marketOpen: () => SoundManager.play("marketOpen"),
  marketClose: () => SoundManager.play("marketClose"),
  profitTarget: () => SoundManager.play("profitTarget"),
  stopLoss: () => SoundManager.play("stopLoss"),
};

// ---------------------------------------------------------------------------
// Haptic patterns per sound type
// ---------------------------------------------------------------------------

function _hapticFor(key) {
  if (Platform.OS === "web") return;
  try {
    switch (key) {
      case "tabSwitch":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "segmentSwitch":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "like":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "unlike":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "sendMessage":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "postCreated":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "commentAdded":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "joinGroup":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "error":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case "logout":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "loginSuccess":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "themeToggle":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      // MetaTrader / chart sounds
      case "orderFilled":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "orderRejected":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case "alertTriggered":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "chartTick":
        // No haptic for chart tick — it fires too frequently
        break;
      case "marketOpen":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "marketClose":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "profitTarget":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "stopLoss":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      default:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch (_) {}
}

export default SoundManager;
