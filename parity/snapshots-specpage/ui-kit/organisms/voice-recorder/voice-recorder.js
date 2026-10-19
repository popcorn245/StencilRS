import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopVoiceRecorder = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.recordingComplete = __stencil_createEvent(this, "recordingComplete", 7);
        this.recordingCancel = __stencil_createEvent(this, "recordingCancel", 7);
    }
    get el() { return __stencil_getElement(this); }
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
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-voice-recorder",
        "componentClassName": "PopVoiceRecorder",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "mode",
                "type": "string",
                "attribute": "mode",
                "reflect": false,
                "mutable": true,
                "required": false,
                "optional": false,
                "defaultValue": "'expanded'",
                "complexType": {
                    "original": "VoiceRecorderMode",
                    "resolved": "\"collapsed\" | \"expanded\"",
                    "references": {
                        "VoiceRecorderMode": {
                            "location": "local",
                            "path": "ui-kit/organisms/voice-recorder/voice-recorder.tsx",
                            "id": "ui-kit/organisms/voice-recorder/voice-recorder.tsx::VoiceRecorderMode"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Visual mode: 'expanded' = active recording bar, 'collapsed' = ring playback"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "audioBlob",
                "type": "any",
                "attribute": "audio-blob",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "Blob",
                    "resolved": "any",
                    "references": {
                        "Blob": {
                            "location": "global",
                            "id": "global::Blob"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Pre-recorded blob to start in collapsed mode"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "isRecording"
            }, {
                "name": "isPaused"
            }, {
                "name": "isPlaying"
            }, {
                "name": "playbackProgress"
            }, {
                "name": "waveformData"
            }],
        "methods": [{
                "name": "begin",
                "docs": {
                    "text": "Call this to begin recording \u2014 only invoke from an explicit user gesture.",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => Promise<any>",
                    "parameters": [],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<any>"
                },
                "internal": false
            }],
        "listeners": [],
        "events": [{
                "name": "recordingComplete",
                "method": "recordingComplete",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when recording is saved \u2014 detail is the AudioBlob"
                },
                "complexType": {
                    "original": "Blob",
                    "resolved": "Blob",
                    "references": {
                        "Blob": {
                            "location": "global",
                            "id": "global::Blob"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "recordingCancel",
                "method": "recordingCancel",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when the user cancels"
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "mode",
                "methodName": "onModeChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-VOICE-RECORDER",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/voice-recorder/voice-recorder.css",
                        "relativePath": "voice-recorder.css",
                        "originalComponentPath": "voice-recorder.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": false,
        "hasComponentDidLoadFn": true,
        "hasComponentShouldUpdateFn": false,
        "hasComponentWillUpdateFn": false,
        "hasComponentDidUpdateFn": false,
        "hasComponentWillRenderFn": false,
        "hasComponentDidRenderFn": false,
        "hasConnectedCallbackFn": false,
        "hasDeserializer": false,
        "hasDisconnectedCallbackFn": true,
        "hasElement": false,
        "hasEvent": true,
        "hasLifecycle": true,
        "hasListener": false,
        "hasListenerTarget": false,
        "hasListenerTargetWindow": false,
        "hasListenerTargetDocument": false,
        "hasListenerTargetBody": false,
        "hasMember": true,
        "hasMethod": true,
        "hasMode": false,
        "hasModernPropertyDecls": true,
        "hasAttribute": true,
        "hasProp": true,
        "hasPropNumber": false,
        "hasPropBoolean": false,
        "hasPropString": true,
        "hasPropMutable": true,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": true,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["class", "onClick", "title", "type", "aria-hidden", "key", "style", "viewBox", "width", "height", "id", "x1", "y1", "x2", "y2", "offset", "stop-color", "cx", "cy", "r", "stroke", "stroke-dasharray", "stroke-dashoffset", "transform"],
        "htmlTagNames": ["div", "button", "svg", "defs", "lineargradient", "stop", "circle"],
        "htmlParts": [],
        "htmlSlots": [],
        "isUpdateable": true,
        "dependents": [],
        "directDependents": [],
        "directDependencies": [],
        "hasPatchAll": false,
        "hasPatchChildren": false,
        "hasPatchClone": false,
        "hasPatchInsert": false
    }; }
    static get watchers() { return {
        "mode": [{
                "onModeChange": 0
            }]
    }; }
};
//# sourceMappingURL=voice-recorder.js.map