import * as Tone from 'tone';

// iOS/iPadOS Safari (and every other browser there — Apple requires them all to embed
// WebKit) puts a page's raw Web Audio API output in the "Ambient" audio session category
// by default, which respects the hardware/software mute switch — unlike native <audio>/
// <video> elements, which get "MediaPlayback" and ignore it. That's the actual cause of
// "no sound on iPad": Tone.js's .toDestination() goes straight to the AudioContext's
// destination, so it's always "Ambient" there, while apps built on <audio>/<video>
// elements (YouTube, Spotify web, ...) aren't.
//
// An earlier version of unlockIOSMediaPlayback() below routed the *actual* synth output
// through a hidden <audio> element (via a MediaStreamAudioDestinationNode) to borrow its
// "MediaPlayback" category. That worked (silence fixed), but real-device testing found
// it audibly distorted the signal — expected in hindsight: piping live Web Audio through
// a MediaStreamAudioDestinationNode into an <audio>/<video> element is a documented
// source of crackle/distortion in WebKit specifically (e.g. webkit.org bugs 215314,
// 221334), unrelated to gain staging, which is why it didn't scale with volume.
//
// iOS ties the "MediaPlayback" unlock to the *page's shared audio session*, not to
// whatever's flowing through any one element — so the fix doesn't need the real signal
// to touch a media element at all. Playing a silent, looping, throwaway <audio> element
// is enough to flip the whole page into "MediaPlayback"; Tone.js's output then keeps
// going straight to AudioContext.destination via .toDestination(), identically to
// desktop, completely untouched by whatever the decoy element is doing. This is the same
// technique used by e.g. https://github.com/swevans/unmute and
// https://github.com/feross/unmute-ios-audio.
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
    // Brick-wall safety net: PolySynth doesn't automatically scale down as more notes
    // stack up, so a dense chord (5-7 simultaneous voices) at unity volume can sum well
    // past 0dBFS and hard-clip — that's the "heavily distorted" sound. Everything routes
    // through here instead of straight to the speakers, and each synth also gets its own
    // volume trim below so the limiter is a backstop, not doing the work on every note.
    this.limiter = new Tone.Limiter(-1);
    // Same destination on every platform now — see unlockIOSMediaPlayback above for why
    // iOS no longer needs (or wants) a different signal path here.
    this.limiter.toDestination();

    // Reference volume the synth is tuned at 4 simultaneous notes — playSegment() scales
    // this by how many notes actually stack (see #scaledVolume), because a 7-note chord
    // sums to measurably more energy than a 4-note one and would otherwise still push
    // past the limiter's reaction time. -10*log10(n/4) is a power-sum estimate (~-3dB per
    // doubling of voices), calibrated against measured peaks, not the far more punishing
    // full-linear-sum worst case.
    // Release is deliberately short despite the "pad"-like envelope below: playSegment()
    // sets this synth's volume for whatever the *new* chord's note count needs, but that
    // same Volume node also governs whatever's still ringing out from the *previous*
    // chord — a long release meant the old notes hadn't decayed by the time the new ones
    // attacked, so a "4-note" volume setting could momentarily be carrying 8+ notes of
    // real energy and clip anyway. Keeping the tail short closes that window. The extra
    // headroom below (vs. an arbitrary -12dB) covers the one deliberate exception: the
    // slow 0.5s attack is comparable to the 0.35s release, so a genuine crossfade — both
    // the outgoing and incoming chord audibly overlapping — is inherent to how this is
    // supposed to sound, not just a timing edge case.
    this.chordBaseVolume = -14;

    // There used to be a second, faster-attack "chord" synth alongside this one — this
    // sine-based sound (originally "pad") was the more pleasant of the two, so it's now
    // the only one; sine is already harmonic-free, so no filter is needed to soften it.
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

    // The arpeggiator is driven by an explicit tickArpeggio(time) call from
    // useRandomizer's single unified 32nd-note clock (see there for why) rather than a
    // Tone.Sequence: reassigning a live Sequence's `events` array mid-flight turned out
    // to make its *next* scheduled step still fire from the old internal schedule,
    // landing exactly one 32nd-note late — precisely "starts on the second 32nd note,
    // not the first." A plain counter read at a call site we fully control has no such
    // internal rescheduling to lag behind.
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
      // Reset so every new chord's sweep starts from its root (index 0) rather than
      // wherever the previous chord's pattern happened to leave off. (An earlier
      // ascending-only cycle could skip this reset: every pattern length from
      // padToSimpleArpeggioLength — 1/2/4/8 — divides the beat's 8 32nd-notes evenly, so
      // the index landed on 0 at the next beat regardless. The up/down bounce below has a
      // period of 2*(n-1), which doesn't share that property, so the reset is explicit.)
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
  // no-op unless arpMuted is false, so callers don't need to branch on soundType.
  //
  // Walks the notes in an up/down bounce (0,1,...,n-1,n-2,...,1, then repeat) rather than
  // snapping straight back to the bottom after the top note — a harp sweep goes both
  // ways. The bounce has period 2*(n-1) (n=1 has no direction to bounce in, so it's
  // pinned at index 0); '8n' note duration lets each ringing note overlap the next
  // instead of cutting off at the next 32nd-note step.
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
