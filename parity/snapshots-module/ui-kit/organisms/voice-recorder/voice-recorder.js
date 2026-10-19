import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopVoiceRecorderStyle0 from "./ui-kit/organisms/voice-recorder/voice-recorder.css?tag=pop-voice-recorder&encapsulation=scoped";
export const PopVoiceRecorder = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.recordingComplete = __stencil_createEvent(this, "recordingComplete", 7);
        this.recordingCancel = __stencil_createEvent(this, "recordingCancel", 7);
    }
    get el() { return this; }
    /** Visual mode: 'expanded' = active recording bar, 'collapsed' = ring playback */
    mode = 'expanded';
    /** Pre-recorded blob to start in collapsed mode */
    audioBlob;
    /** Emitted when recording is saved — detail is the AudioBlob */
    recordingComplete;
    /** Emitted when the user cancels */
    recordingCancel;
    isRecording = false;
    isPaused = false;
    isPlaying = false;
    playbackProgress = 0; // 0–1
    waveformData = new Array(40).fill(0);
    mediaRecorder;
    chunks = [];
    audioCtx;
    analyser;
    waveformRaf;
    savedBlob;
    audioEl;
    componentDidLoad() {
        if (this.audioBlob) {
            this.savedBlob = this.audioBlob;
        }
    }
    /** Call this to begin recording — only invoke from an explicit user gesture. */
    async begin() {
        if (!this.isRecording && !this.savedBlob) {
            await this.startRecording();
        }
    }
    disconnectedCallback() {
        this.cleanup();
    }
    onModeChange(newMode) {
        if (newMode === 'collapsed' && this.isRecording) {
            this.stopAndSave();
        }
    }
    // ─── Recording ────────────────────────────────────────────────────────────
    /** Detect best supported MIME type across browsers (Safari → mp4, others → webm) */
    getBestMimeType() {
        const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', ''];
        for (const type of candidates) {
            if (!type || (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type))) {
                return type;
            }
        }
        return '';
    }
    async startRecording() {
        if (typeof MediaRecorder === 'undefined') {
            console.warn('pop-voice-recorder: MediaRecorder not supported in this browser');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // iOS Safari requires webkitAudioContext fallback
            const AC = (window.AudioContext ?? window.webkitAudioContext);
            this.audioCtx = new AC();
            // iOS Safari suspends AudioContext until resumed inside a user-gesture handler.
            // We're already inside one (button click → startRecording), so resume() is safe.
            if (this.audioCtx.state === 'suspended') {
                await this.audioCtx.resume();
            }
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 128;
            const source = this.audioCtx.createMediaStreamSource(stream);
            source.connect(this.analyser);
            const mimeType = this.getBestMimeType();
            const recorderOptions = mimeType ? { mimeType } : undefined;
            this.mediaRecorder = new MediaRecorder(stream, recorderOptions);
            this.chunks = [];
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0)
                    this.chunks.push(e.data);
            };
            this.mediaRecorder.onstop = () => {
                const finalType = this.mediaRecorder?.mimeType || mimeType || 'audio/webm';
                this.savedBlob = new Blob(this.chunks, { type: finalType });
                stream.getTracks().forEach((t) => t.stop());
                this.stopWaveform();
            };
            this.mediaRecorder.start(100);
            this.isRecording = true;
            this.isPaused = false;
            this.startWaveform();
        }
        catch (err) {
            console.error('pop-voice-recorder: mic access denied', err);
        }
    }
    /** iOS Safari does not support MediaRecorder.pause() — check before calling */
    get canPause() {
        try {
            return typeof this.mediaRecorder?.pause === 'function';
        }
        catch {
            return false;
        }
    }
    pauseRecording() {
        if (this.mediaRecorder?.state === 'recording') {
            if (this.canPause) {
                this.mediaRecorder.pause();
            }
            else {
                // Fallback: stop and save on platforms without pause support
                this.stopAndSave();
                return;
            }
            this.isPaused = true;
        }
    }
    resumeRecording() {
        if (this.mediaRecorder?.state === 'paused') {
            this.mediaRecorder.resume();
            this.isPaused = false;
        }
    }
    stopAndSave() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.isRecording = false;
        this.mode = 'collapsed';
    }
    cancel() {
        this.cleanup();
        this.savedBlob = undefined;
        this.recordingCancel.emit();
    }
    handleSave() {
        if (this.savedBlob) {
            this.recordingComplete.emit(this.savedBlob);
        }
        else {
            this.stopAndSave();
        }
    }
    // ─── Waveform ─────────────────────────────────────────────────────────────
    startWaveform() {
        const tick = () => {
            if (!this.analyser)
                return;
            const data = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteTimeDomainData(data);
            // Downsample to 40 bars
            const step = Math.floor(data.length / 40);
            this.waveformData = Array.from({ length: 40 }, (_, i) => {
                const val = data[i * step] ?? 128;
                return Math.abs(val - 128) / 128; // 0–1 amplitude
            });
            this.waveformRaf = requestAnimationFrame(tick);
        };
        this.waveformRaf = requestAnimationFrame(tick);
    }
    stopWaveform() {
        if (this.waveformRaf)
            cancelAnimationFrame(this.waveformRaf);
        this.waveformData = new Array(40).fill(0);
    }
    // ─── Playback ─────────────────────────────────────────────────────────────
    togglePlayback() {
        if (!this.savedBlob)
            return;
        if (!this.audioEl) {
            this.audioEl = new Audio(URL.createObjectURL(this.savedBlob));
            this.audioEl.ontimeupdate = () => {
                if (this.audioEl && this.audioEl.duration) {
                    this.playbackProgress = this.audioEl.currentTime / this.audioEl.duration;
                }
            };
            this.audioEl.onended = () => {
                this.isPlaying = false;
                this.playbackProgress = 0;
            };
        }
        if (this.isPlaying) {
            this.audioEl.pause();
            this.isPlaying = false;
        }
        else {
            this.audioEl.play();
            this.isPlaying = true;
        }
    }
    cleanup() {
        if (this.mediaRecorder?.state !== 'inactive') {
            this.mediaRecorder?.stop();
        }
        this.audioCtx?.close();
        this.stopWaveform();
        this.audioEl?.pause();
    }
    // ─── Render ───────────────────────────────────────────────────────────────
    render() {
        if (this.mode === 'collapsed') {
            return this.renderCollapsed();
        }
        return this.renderExpanded();
    }
    renderExpanded() {
        return (h("div", { class: "vr-expanded" },
            h("button", { class: { 'vr-record-btn': true, 'is-paused': this.isPaused }, onClick: () => this.isPaused ? this.resumeRecording() : this.pauseRecording(), title: this.isPaused ? 'Resume' : 'Pause', type: "button" }, this.isPaused ? '▶' : '⏸'),
            h("div", { class: "vr-waveform", "aria-hidden": "true" }, this.waveformData.map((amp, i) => (h("div", { key: i, class: "vr-bar", style: { transform: `scaleY(${Math.max(0.08, amp)})` } })))),
            h("div", { class: "vr-actions" },
                h("button", { class: "vr-btn vr-btn--cancel", onClick: () => this.cancel(), title: "Cancel", type: "button" }, "\u2715"),
                h("button", { class: "vr-btn vr-btn--save", onClick: () => this.handleSave(), title: "Save", type: "button" }, "\u2713"))));
    }
    renderCollapsed() {
        const r = 22;
        const circumference = 2 * Math.PI * r;
        const offset = circumference * (1 - this.playbackProgress);
        return (h("div", { class: { 'vr-collapsed': true, 'is-playing': this.isPlaying } },
            h("svg", { class: "vr-ring", viewBox: "0 0 52 52", width: "52", height: "52", "aria-hidden": "true" },
                h("defs", null,
                    h("linearGradient", { id: "vr-rainbow", x1: "0%", y1: "0%", x2: "100%", y2: "100%" },
                        h("stop", { offset: "0%", "stop-color": "#a855f7" }),
                        h("stop", { offset: "33%", "stop-color": "#3b82f6" }),
                        h("stop", { offset: "66%", "stop-color": "#22c55e" }),
                        h("stop", { offset: "100%", "stop-color": "#ec4899" }))),
                h("circle", { cx: "26", cy: "26", r: r, class: "vr-ring-track" }),
                h("circle", { cx: "26", cy: "26", r: r, class: "vr-ring-progress", stroke: "url(#vr-rainbow)", "stroke-dasharray": circumference, "stroke-dashoffset": offset, transform: "rotate(-90 26 26)" })),
            h("button", { class: "vr-play-btn", onClick: () => this.togglePlayback(), title: this.isPlaying ? 'Pause' : 'Play', type: "button" }, this.isPlaying ? '⏸' : '▶'),
            h("button", { class: "vr-discard-btn", onClick: () => this.cancel(), title: "Discard", type: "button" }, "\u2715")));
    }
    static get watchers() { return {
        "mode": [{
                "onModeChange": 0
            }]
    }; }
    static get style() { return PopVoiceRecorderStyle0(); }
};
__stencil_proxyCustomElement(PopVoiceRecorder, [514, "pop-voice-recorder", {
        "mode": [1025],
        "audioBlob": [8, "audio-blob"],
        "isRecording": [32],
        "isPaused": [32],
        "isPlaying": [32],
        "playbackProgress": [32],
        "waveformData": [32],
        "begin": [64]
    }, undefined, {
        "mode": [{
                "onModeChange": 0
            }]
    }]);
//# sourceMappingURL=voice-recorder.js.map