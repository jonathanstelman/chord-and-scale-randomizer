import * as Tone from 'tone';

// Owns the actual synths and whatever is currently sounding (held chord/pad notes, or a
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
    this.limiter = new Tone.Limiter(-1).toDestination();

    // Reference volume each synth is tuned at 4 simultaneous notes — playSegment() scales
    // this by how many notes actually stack (see #scaledVolume), because a 7-note chord
    // sums to measurably more energy than a 4-note one and would otherwise still push
    // past the limiter's reaction time. -10*log10(n/4) is a power-sum estimate (~-3dB per
    // doubling of voices), calibrated against measured peaks, not the far more punishing
    // full-linear-sum worst case.
    // Pad carries extra headroom on top of the shorter envelope above: its slower attack
    // (0.5s) is comparable to its own release (0.35s), so a genuine crossfade — both the
    // outgoing and incoming chord audibly overlapping — is inherent to how a pad is
    // supposed to sound, not just a timing edge case. Chord's fast attack/short release
    // only needs a smaller margin for the rare tight-tempo overlap.
    this.chordBaseVolume = -12;
    this.padBaseVolume = -14;

    // A raw, unfiltered triangle oscillator carries a fair amount of high-harmonic edge
    // that reads as "buzzy" or "harsh" well before anything is technically clipping —
    // gentle lowpass shaping softens that without dulling the chord's identity.
    this.chordFilter = new Tone.Filter(3200, 'lowpass').connect(this.limiter);
    this.chordSynth = new Tone.PolySynth(Tone.Synth, {
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.65, release: 0.25 },
    }).connect(this.chordFilter);

    // Release is deliberately short despite the "pad" name: playSegment() sets this
    // synth's volume for whatever the *new* chord's note count needs, but that same
    // Volume node also governs whatever's still ringing out from the *previous* chord —
    // a long release meant the old notes hadn't decayed by the time the new ones
    // attacked, so a "4-note" volume setting could momentarily be carrying 8+ notes of
    // real energy and clip anyway. Keeping the tail short closes that window.
    this.padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.5, decay: 0.2, sustain: 0.7, release: 0.35 },
    }).connect(this.limiter); // sine is already harmonic-free; no filter needed

    this.arpFilter = new Tone.Filter(4500, 'lowpass').connect(this.limiter);
    this.arpSynth = new Tone.PolySynth(Tone.Synth, {
      volume: -6,
      envelope: { attack: 0.005, decay: 0.12, sustain: 0.15, release: 0.12 },
    }).connect(this.arpFilter);

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
      // Deliberately *not* resetting arpStepIndex: every pattern length from
      // padToSimpleArpeggioLength (1/2/4/8) divides the 8 32nd-notes in a beat evenly, so
      // however many steps have elapsed since the session started, the index is already
      // guaranteed to land on 0 the moment tickArpeggio() is next called for this beat —
      // no explicit resync needed, and one less thing that could itself be off by a step.
      this.arpNotes = noteNames;
      this.arpMuted = false;
      return;
    }
    const isPad = soundType === 'pad';
    const synth = isPad ? this.padSynth : this.chordSynth;
    const baseVolume = isPad ? this.padBaseVolume : this.chordBaseVolume;
    synth.volume.value = baseVolume - 10 * Math.log10(Math.max(1, noteNames.length) / 4);
    synth.triggerAttack(noteNames, time);
    this.heldSynth = synth;
    this.heldNotes = noteNames;
  }

  // `accent` marks the first beat of a new tonal-center segment, so the downbeat is
  // audibly distinguishable from the rest of the bar.
  click(time, accent = false) {
    this.clickSynth.triggerAttackRelease(accent ? 'C6' : 'G5', '64n', time, accent ? 0.9 : 0.5);
  }

  // Called once per 32nd note by useRandomizer's clock, in arpeggio mode or not — it's a
  // no-op unless arpMuted is false, so callers don't need to branch on soundType.
  tickArpeggio(time) {
    if (this.arpMuted || this.arpNotes.length === 0) return;
    const note = this.arpNotes[this.arpStepIndex % this.arpNotes.length];
    this.arpStepIndex += 1;
    this.arpSynth.triggerAttackRelease(note, '64n', time);
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
    this.chordFilter.dispose();
    this.padSynth.dispose();
    this.arpSynth.dispose();
    this.arpFilter.dispose();
    this.clickSynth.dispose();
    this.limiter.dispose();
  }
}
