import * as Tone from 'tone';

// iOS Safari puts a page's raw Web Audio output in the "Ambient" session category by
// default, which respects the hardware mute switch — see docs/architecture/audio.md for
// why, and for an approach that was tried and rejected before this one.
export const IS_IOS = typeof navigator !== 'undefined' && (
  /iPad|iPhone|iPod/.test(navigator.userAgent)
  // iPadOS 13+ masquerades as "MacIntel" in the UA string under its default desktop-site
  // request — but a real Mac has no touch points, so this still isolates real iPads.
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
);

// A vanishingly short, completely silent WAV, built at runtime rather than checked in as
// an opaque base64 blob so the "why" stays legible: 8-bit PCM's silent value is 128 (the
// unsigned midpoint), not 0, and everything else here is bog-standard RIFF/WAVE header
// bookkeeping. Loops seamlessly since every sample is identical — no discontinuity at
// the wrap point to click on, even though it's inaudible either way.
function buildSilentWavUrl(durationSeconds = 0.5, sampleRate = 8000) {
  const dataSize = Math.round(durationSeconds * sampleRate); // 8-bit mono: 1 byte/sample
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // byte rate = sampleRate * channels * bytes/sample
  view.setUint16(32, 1, true); // block align
  view.setUint16(34, 8, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < dataSize; i++) view.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

let iosUnlocked = false;

// Must be called synchronously from within the same user-gesture handler that calls
// Tone.start() (see useRandomizer.js's start()) — <audio>.play() is itself subject to the
// same autoplay-gesture requirement as AudioContext.resume(), so this can't be deferred
// into, say, TonalCenterPlayer's constructor alone if that ends up running too late.
// Idempotent: the same hidden element keeps looping for the rest of the page's life once
// created, across every subsequent start()/stop() cycle — no need to touch it again.
export function unlockIOSMediaPlayback() {
  if (!IS_IOS || iosUnlocked) return;
  iosUnlocked = true;
  const audioEl = new Audio(buildSilentWavUrl());
  audioEl.loop = true;
  audioEl.style.display = 'none';
  document.body.appendChild(audioEl);
  // Ignore rejection: IS_IOS already gates this to the one platform it's needed on, and
  // this is only ever called from a real tap, so a rejection here would mean the browser
  // changed its autoplay rules, not a bug to recover from at runtime.
  audioEl.play().catch(() => {});
}

// Owns the actual synths and whatever is currently sounding (held chord notes, or a
// running arpeggio sequence), plus a separate click synth for the metronome. One instance
// lives for the life of a randomizer session. All playback methods take an optional Tone
// transport `time` so callers can schedule sample-accurately instead of firing "now".
export class TonalCenterPlayer {
  constructor() {
    // Brick-wall safety net against PolySynth clipping — see docs/architecture/audio.md's
    // Gain staging note; each synth's own volume trim below is the actual defense.
    this.limiter = new Tone.Limiter(-1);
    this.limiter.toDestination();

    // Calibrated at 4 simultaneous notes; playSegment() rescales per note-count. -14dB
    // (not the more typical -12dB) leaves extra headroom for the slow attack/release
    // crossfade below — see docs/architecture/audio.md's Gain staging note for why.
    this.chordBaseVolume = -14;

    // Sine — harmonic-free, so no filter is needed to soften it.
    this.chordSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.5, decay: 0.2, sustain: 0.7, release: 0.35 },
    }).connect(this.limiter);

    // Harp-like: a sine oscillator (no filter needed, same reasoning as chordSynth above)
    // with a soft attack and a long decay/release so each plucked note rings well past
    // the next 32nd-note step instead of cutting off hard — that overlap, plus the
    // up/down bounce in tickArpeggio(), is what reads as a "sweep" rather than a
    // staccato, video-game-arpeggio stepping through notes.
    this.arpSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      volume: -8,
      envelope: { attack: 0.03, decay: 0.35, sustain: 0.15, release: 0.4 },
    }).connect(this.limiter);

    // Driven by an explicit tickArpeggio() call, not a Tone.Sequence — see
    // docs/architecture/audio.md for why (don't "simplify" this back to a Sequence).
    this.arpNotes = [];
    this.arpMuted = true;
    this.arpStepIndex = 0;

    this.clickSynth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.02 },
    }).connect(this.limiter);
    this.setMetronomeVolume(50); // overwritten immediately by the caller's own setting

    this.heldSynth = null;
    this.heldNotes = [];
  }

  stopCurrent(time) {
    this.arpMuted = true;
    if (this.heldSynth && this.heldNotes.length) {
      this.heldSynth.triggerRelease(this.heldNotes, time);
      this.heldSynth = null;
      this.heldNotes = [];
    }
  }

  playSegment(soundType, noteNames, time) {
    this.stopCurrent(time);
    if (soundType === 'none') {
      // Silent mode: still advances the beat clock and click track (see useRandomizer),
      // just doesn't sound the tonal center itself — e.g. for practicing against the
      // metronome alone, or singing/playing the answer before checking it.
      return;
    }
    if (soundType === 'arpeggio') {
      // Reset so every new chord starts its sweep at the root — see
      // docs/architecture/audio.md for why this needs to be explicit now.
      this.arpNotes = noteNames;
      this.arpMuted = false;
      this.arpStepIndex = 0;
      return;
    }
    this.chordSynth.volume.value =
      this.chordBaseVolume - 10 * Math.log10(Math.max(1, noteNames.length) / 4);
    this.chordSynth.triggerAttack(noteNames, time);
    this.heldSynth = this.chordSynth;
    this.heldNotes = noteNames;
  }

  // `accent` marks the first beat of a new tonal-center segment, so the downbeat is
  // audibly distinguishable from the rest of the bar.
  click(time, accent = false) {
    this.clickSynth.triggerAttackRelease(accent ? 'C6' : 'G5', '64n', time, accent ? 0.9 : 0.5);
  }

  // Called once per 32nd note by useRandomizer's clock, in arpeggio mode or not — it's a
  // no-op unless arpMuted is false, so callers don't need to branch on soundType. Walks
  // notes in an up/down bounce — see docs/architecture/audio.md for the period math.
  tickArpeggio(time) {
    if (this.arpMuted || this.arpNotes.length === 0) return;
    const n = this.arpNotes.length;
    const period = n > 1 ? 2 * (n - 1) : 1;
    const pos = this.arpStepIndex % period;
    const index = pos < n ? pos : period - pos;
    this.arpStepIndex += 1;
    this.arpSynth.triggerAttackRelease(this.arpNotes[index], '8n', time);
  }

  // `percent` is 0-100 (the UI's slider units) mapped onto a -40dB..0dB range — 0 isn't
  // literal silence, just quiet enough to sit under everything else; use the separate
  // metronome on/off toggle for actual silence.
  setMetronomeVolume(percent) {
    const clamped = Math.max(0, Math.min(100, percent));
    this.clickSynth.volume.value = (clamped - 100) * 0.4;
  }

  dispose() {
    this.stopCurrent();
    this.chordSynth.dispose();
    this.arpSynth.dispose();
    this.clickSynth.dispose();
    this.limiter.dispose();
  }
}
