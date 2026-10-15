import { Component, Prop, h, Event, EventEmitter } from '@stencil/core';

export interface FilePreviewItem {
  name: string;
  url: string;
  type: string;
}

@Component({
  tag: 'pop-file-preview',
  encapsulation: { type: 'scoped' },
  styleUrl: 'file-preview.css',
})
export class PopFilePreview {
  /** JSON array of {name, url, type} objects */
  @Prop() files: string = '[]';

  /** Emitted when a file remove button is clicked, with the index */
  @Event() popFileRemove: EventEmitter<number>;

  private get parsedFiles(): FilePreviewItem[] {
    try {
      return JSON.parse(this.files);
    } catch {
      return [];
    }
  }

  render() {
    const items = this.parsedFiles;
    if (items.length === 0) return null;

    return (
      <div class="file-preview-area">
        {items.map((file, i) => (
          <div class="file-preview-card" key={i}>
            <img src={file.url} alt={file.name || 'Preview'} />
            <button class="remove-file-btn" onClick={() => this.popFileRemove.emit(i)}>
              &#10005;
            </button>
          </div>
        ))}
      </div>
    );
  }
}
