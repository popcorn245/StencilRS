import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopMessageBoxStyle0 from "./ui-kit/organisms/message-box/message-box.css?tag=pop-message-box&encapsulation=scoped";
export const PopMessageBox = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.send = __stencil_createEvent(this, "send", 7);
        this.valueChange = __stencil_createEvent(this, "valueChange", 7);
        this.popModelChanged = __stencil_createEvent(this, "popModelChanged", 7);
        this.popModeChanged = __stencil_createEvent(this, "popModeChanged", 7);
        this.popToolToggled = __stencil_createEvent(this, "popToolToggled", 7);
    }
    get el() { return __stencil_getElement(this); }
    placeholder = 'Message';
    value = '';
    disabled = false;
    // ── Toolbar props (forwarded to pop-chat-toolbar) ──
    showMicButton = false;
    models = '[]';
    selectedModel = '';
    selectedMode = 'chat';
    tools = '[]';
    activeTools = '[]';
    /**
     * Emitted when the message is sent
     */
    send;
    valueChange;
    // Toolbar events re-emitted
    popModelChanged;
    popModeChanged;
    popToolToggled;
    isEmpty = true;
    selectedFiles = [];
    filePreviews = [];
    inputDiv;
    fileInput;
    componentDidLoad() {
        if (this.value && this.inputDiv) {
            this.inputDiv.innerText = this.value;
            this.checkEmpty();
        }
    }
    async setFocus() {
        this.inputDiv?.focus();
    }
    async clear() {
        if (this.inputDiv) {
            this.inputDiv.innerHTML = '';
            this.checkEmpty();
        }
        this.clearFiles();
    }
    async setInputValue(text) {
        if (this.inputDiv) {
            this.inputDiv.innerText = text;
            this.checkEmpty();
            this.valueChange.emit(text);
            this.inputDiv.focus();
        }
    }
    clearFiles = () => {
        this.selectedFiles = [];
        this.filePreviews.forEach(p => URL.revokeObjectURL(p));
        this.filePreviews = [];
        if (this.fileInput)
            this.fileInput.value = '';
    };
    removeFile = (index) => {
        const newFiles = [...this.selectedFiles];
        const newPreviews = [...this.filePreviews];
        URL.revokeObjectURL(newPreviews[index]);
        newFiles.splice(index, 1);
        newPreviews.splice(index, 1);
        this.selectedFiles = newFiles;
        this.filePreviews = newPreviews;
    };
    handleInput = () => {
        this.checkEmpty();
        this.valueChange.emit(this.inputDiv.innerText);
    };
    handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.triggerSend();
        }
    };
    triggerSend = () => {
        const text = this.inputDiv.innerText.trim();
        if (text || this.selectedFiles.length > 0) {
            this.send.emit({ text, files: this.selectedFiles });
        }
    };
    checkEmpty() {
        this.isEmpty = !this.inputDiv?.innerText.trim();
    }
    handlePaste = async (e) => {
        e.preventDefault();
        // 1. Check for Files in Clipboard (e.g. Copied Image)
        const items = e.clipboardData?.items;
        let hasFile = false;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        this.addFile(file);
                        hasFile = true;
                    }
                }
            }
        }
        if (hasFile)
            return;
        // 2. Check for HTML (Windows Emoji Keyboard often pastes HTML <img>)
        const html = e.clipboardData.getData('text/html');
        if (html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const img = doc.querySelector('img');
            if (img && img.src) {
                try {
                    // Fetch the image as a blob
                    const response = await fetch(img.src);
                    const blob = await response.blob();
                    const file = new File([blob], "pasted_image.gif", { type: blob.type });
                    this.addFile(file);
                    return;
                }
                catch (err) {
                    console.error("Failed to fetch pasted image URL", err);
                }
            }
        }
        // 3. Fallback: Text
        const text = e.clipboardData.getData('text/plain');
        if (text) {
            document.execCommand('insertText', false, text);
        }
    };
    handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.disabled)
            return;
        if (e.dataTransfer) {
            // 1. Files
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                Array.from(e.dataTransfer.files).forEach(f => this.addFile(f));
                return;
            }
            // 2. HTML (sometimes GIFs come as HTML in drop too)
            const html = e.dataTransfer.getData('text/html');
            if (html) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const img = doc.querySelector('img');
                if (img && img.src) {
                    try {
                        const response = await fetch(img.src);
                        const blob = await response.blob();
                        const file = new File([blob], "dropped_image.gif", { type: blob.type });
                        this.addFile(file);
                        return;
                    }
                    catch (err) {
                        console.error("Failed to fetch dropped image URL", err);
                    }
                }
            }
        }
    };
    addFile = (file) => {
        if (!file)
            return;
        if (!file.type.startsWith('image/')) {
            alert("Only images are supported for now.");
            return;
        }
        this.selectedFiles = [...this.selectedFiles, file];
        this.filePreviews = [...this.filePreviews, URL.createObjectURL(file)];
    };
    onFileChange = (e) => {
        const input = e.target;
        if (input.files && input.files.length > 0) {
            Array.from(input.files).forEach(f => this.addFile(f));
        }
    };
    render() {
        return (h("div", { key: '0', class: "mb-outer" },
            h("div", { key: '1', class: {
                    "message-box-container": true,
                    "disabled": this.disabled,
                    "has-file": this.selectedFiles.length > 0
                }, onDragOver: (e) => { e.preventDefault(); e.stopPropagation(); }, onDrop: this.handleDrop },
                h("input", { key: '2', type: "file", accept: "image/*", multiple: true, style: { display: 'none' }, ref: el => this.fileInput = el, onChange: this.onFileChange }),
                h("div", { key: '3', class: "attach-button-wrapper" },
                    h("button", { key: '4', class: "attach-btn", disabled: this.disabled, title: "Upload Image", onClick: () => this.fileInput.click() },
                        h("div", { key: '5', class: "circle-plus" },
                            h("svg", { key: '6', width: "24", height: "24", viewBox: "0 0 512 512", class: "icon-photo" },
                                h("path", { key: '7', fill: "currentColor", d: "M416,64H96a64.07,64.07,0,0,0-64,64V384a64.07,64.07,0,0,0,64,64H416a64.07,64.07,0,0,0,64-64V128A64.07,64.07,0,0,0,416,64Zm-80,64a48,48,0,1,1-48,48A48.05,48.05,0,0,1,336,128ZM96,416a32,32,0,0,1-32-32V316.37l94.84-84.3a48.06,48.06,0,0,1,65.8,1.9l64.95,64.81L172.37,416Zm352-32a32,32,0,0,1-32,32H217.63L339.05,294.58a47.72,47.72,0,0,1,61.64-.16L448,333.84Z" }))))),
                h("div", { key: '8', class: "content-wrapper" },
                    this.selectedFiles.length > 0 && (h("pop-file-preview", { key: '9', files: JSON.stringify(this.selectedFiles.map((f, i) => ({ name: f.name, url: this.filePreviews[i], type: f.type }))), onPopFileRemove: (e) => this.removeFile(e.detail) })),
                    h("div", { key: 'a', class: "input-wrapper" },
                        h("div", { key: 'b', class: "rich-input", contentEditable: !this.disabled, role: "textbox", "aria-multiline": "true", "data-placeholder": this.placeholder, ref: (el) => this.inputDiv = el, onInput: this.handleInput, onKeyDown: this.handleKeyDown, onPaste: this.handlePaste }))),
                h("div", { key: 'c', class: "actions-wrapper" },
                    h("button", { key: 'd', class: "send-btn", disabled: this.disabled || (this.isEmpty && this.selectedFiles.length === 0), title: "Send", onClick: this.triggerSend },
                        h("svg", { key: 'e', width: "24", height: "24", viewBox: "0 0 24 24" },
                            h("path", { key: 'f', fill: "currentColor", d: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" }))))),
            h("pop-chat-toolbar", { key: 'g', models: this.models, "selected-model": this.selectedModel, "selected-mode": this.selectedMode, tools: this.tools, "active-tools": this.activeTools, "show-mic-button": this.showMicButton, onPopModelChanged: (e) => this.popModelChanged.emit(e.detail), onPopModeChanged: (e) => this.popModeChanged.emit(e.detail), onPopToolToggled: (e) => this.popToolToggled.emit(e.detail) },
                h("slot", { key: 'h', name: "toolbar-end", slot: "toolbar-end" }))));
    }
};
PopMessageBox.style = PopMessageBoxStyle0();
//# sourceMappingURL=message-box.js.map