import { Component, Prop, h, Event, EventEmitter, Element, Method, State } from '@stencil/core';

@Component({
  tag: 'pop-message-box',
  encapsulation: { type: 'scoped' },
  styleUrl: 'message-box.css',
})
export class PopMessageBox {
  @Element() el: HTMLElement;

  @Prop() placeholder: string = 'Message';
  @Prop() value: string = '';
  @Prop() disabled: boolean = false;

  // ── Toolbar props (forwarded to pop-chat-toolbar) ──
  @Prop() showMicButton: boolean = false;
  @Prop() models: string = '[]';
  @Prop() selectedModel: string = '';
  @Prop() selectedMode: string = 'chat';
  @Prop() tools: string = '[]';
  @Prop() activeTools: string = '[]';

  /**
   * Emitted when the message is sent
   */
  @Event({
      eventName: 'send',
      composed: true,
      bubbles: true,
  }) send: EventEmitter<{ text: string, files: File[] }>;

  @Event({
      eventName: 'valueChange',
      composed: true,
      bubbles: true,
  }) valueChange: EventEmitter<string>;

  // Toolbar events re-emitted
  @Event({ composed: true, bubbles: true }) popModelChanged: EventEmitter<string>;
  @Event({ composed: true, bubbles: true }) popModeChanged: EventEmitter<string>;
  @Event({ composed: true, bubbles: true }) popToolToggled: EventEmitter<{ id: string; enabled: boolean }>;

  @State() isEmpty: boolean = true;
  @State() selectedFiles: File[] = [];
  @State() filePreviews: string[] = [];

  private inputDiv: HTMLElement;
  private fileInput: HTMLInputElement;

  componentDidLoad() {
      if (this.value && this.inputDiv) {
          this.inputDiv.innerText = this.value;
          this.checkEmpty();
      }
  }

  @Method()
  async setFocus(): Promise<any> {
      this.inputDiv?.focus();
  }
  
  @Method()
  async clear(): Promise<any> {
      if (this.inputDiv) {
          this.inputDiv.innerHTML = '';
          this.checkEmpty();
      }
      this.clearFiles();
  }

  @Method()
  async setInputValue(text: string): Promise<any> {
      if (this.inputDiv) {
          this.inputDiv.innerText = text;
          this.checkEmpty();
          this.valueChange.emit(text);
          this.inputDiv.focus();
      }
  }

  private clearFiles = () => {
      this.selectedFiles = [];
      this.filePreviews.forEach(p => URL.revokeObjectURL(p));
      this.filePreviews = [];
      if (this.fileInput) this.fileInput.value = '';
  }
  
  private removeFile = (index: number) => {
      const newFiles = [...this.selectedFiles];
      const newPreviews = [...this.filePreviews];
      
      URL.revokeObjectURL(newPreviews[index]);
      
      newFiles.splice(index, 1);
      newPreviews.splice(index, 1);
      
      this.selectedFiles = newFiles;
      this.filePreviews = newPreviews;
  }

  private handleInput = () => {
      this.checkEmpty();
      this.valueChange.emit(this.inputDiv.innerText);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.triggerSend();
      }
  };

  private triggerSend = () => {
      const text = this.inputDiv.innerText.trim();
      if (text || this.selectedFiles.length > 0) {
          this.send.emit({ text, files: this.selectedFiles });
      }
  };

  private checkEmpty() {
      this.isEmpty = !this.inputDiv?.innerText.trim();
  }
  
  private handlePaste = async (e: ClipboardEvent) => {
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
      if (hasFile) return;

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
              } catch (err) {
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

  private handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (this.disabled) return;

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
                 } catch (err) {
                     console.error("Failed to fetch dropped image URL", err);
                 }
             }
          }
      }
  };

  private addFile = (file: File) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
          alert("Only images are supported for now.");
          return;
      }
      this.selectedFiles = [...this.selectedFiles, file];
      this.filePreviews = [...this.filePreviews, URL.createObjectURL(file)];
  };

  private onFileChange = (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
          Array.from(input.files).forEach(f => this.addFile(f));
      }
  };

  render() {
    return (
      <div class="mb-outer">
      <div
          class={{
              "message-box-container": true,
              "disabled": this.disabled,
              "has-file": this.selectedFiles.length > 0
          }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={this.handleDrop}
      >
        <input 
            type="file" 
            accept="image/*" 
            multiple
            style={{display: 'none'}} 
            ref={el => this.fileInput = el}
            onChange={this.onFileChange}
        />

        {/* Attachment Button */}
        <div class="attach-button-wrapper">
            <button 
                class="attach-btn" 
                disabled={this.disabled} 
                title="Upload Image"
                onClick={() => this.fileInput.click()}
            >
               <div class="circle-plus">
                    <svg width="24" height="24" viewBox="0 0 512 512" class="icon-photo">
                        <path fill="currentColor" d="M416,64H96a64.07,64.07,0,0,0-64,64V384a64.07,64.07,0,0,0,64,64H416a64.07,64.07,0,0,0,64-64V128A64.07,64.07,0,0,0,416,64Zm-80,64a48,48,0,1,1-48,48A48.05,48.05,0,0,1,336,128ZM96,416a32,32,0,0,1-32-32V316.37l94.84-84.3a48.06,48.06,0,0,1,65.8,1.9l64.95,64.81L172.37,416Zm352-32a32,32,0,0,1-32,32H217.63L339.05,294.58a47.72,47.72,0,0,1,61.64-.16L448,333.84Z"/>
                    </svg>
               </div>
            </button>
        </div>

        {/* Content Area */}
        <div class="content-wrapper">
            {/* File Preview */}
            {this.selectedFiles.length > 0 && (
                <pop-file-preview
                  files={JSON.stringify(this.selectedFiles.map((f, i) => ({ name: f.name, url: this.filePreviews[i], type: f.type })))}
                  onPopFileRemove={(e: CustomEvent<number>) => this.removeFile(e.detail)}
                />
            )}

            {/* Input Area */}
            <div class="input-wrapper">
                <div 
                    class="rich-input" 
                    contentEditable={!this.disabled} 
                    role="textbox" 
                    aria-multiline="true"
                    data-placeholder={this.placeholder} 
                    ref={(el) => this.inputDiv = el}
                    onInput={this.handleInput}
                    onKeyDown={this.handleKeyDown}
                    onPaste={this.handlePaste}
                ></div>
            </div>
        </div>

        {/* Send Button */}
        <div class="actions-wrapper">
             <button
                class="send-btn"
                disabled={this.disabled || (this.isEmpty && this.selectedFiles.length === 0)}
                title="Send"
                onClick={this.triggerSend}
             >
                 <svg width="24" height="24" viewBox="0 0 24 24">
                     <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                 </svg>
             </button>
        </div>
      </div>

      {/* Toolbar row */}
      <pop-chat-toolbar
        models={this.models}
        selected-model={this.selectedModel}
        selected-mode={this.selectedMode}
        tools={this.tools}
        active-tools={this.activeTools}
        show-mic-button={this.showMicButton}
        onPopModelChanged={(e: CustomEvent<string>) => this.popModelChanged.emit(e.detail)}
        onPopModeChanged={(e: CustomEvent<string>) => this.popModeChanged.emit(e.detail)}
        onPopToolToggled={(e: CustomEvent<any>) => this.popToolToggled.emit(e.detail)}
      >
        <slot name="toolbar-end" slot="toolbar-end" />
      </pop-chat-toolbar>
      </div>
    );
  }
}
