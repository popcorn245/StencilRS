/**
 * CopyLinkTune – EditorJS Block Tune
 * 
 * Adds a "Copy Link" button to every block's settings menu.
 * Copies a direct link to the block explorer for this specific block.
 */

export default class CopyLinkTune {
  private blockId: string;

  static get isTune() {
    return true;
  }

  constructor({ block }: any) {
    this.blockId = block?.id;
  }

  private readonly linkIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;

  render() {
    return {
      icon: this.linkIcon,
      name: 'copyLinkTune',
      title: 'Copy link to block',
      closeOnActivate: true,
      onActivate: (item: any, e: Event) => {
        if (e) e.preventDefault();
        if (this.blockId) {
          const url = `${window.location.origin}/blocks/${this.blockId}`;
          navigator.clipboard.writeText(url).then(() => {
             // Optional: visual feedback
             item.title = 'Copied!';
             // This doesn't re-render automatically in EditorJS tune menu immediately without dispatch, but closeOnActivate handles it gracefully
          }).catch(err => console.error('Failed to copy', err));
        }
      }
    };
  }

  save() {
    // This tune doesn't save any data to the block
    return {};
  }
}
