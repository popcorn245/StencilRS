import { Component, Prop, State, Watch, h } from '@stencil/core';

@Component({
  tag: 'pop-avatar',
  encapsulation: { type: 'scoped' },
  styleUrl: 'avatar.css',
})
export class Avatar {
  @Prop() src: string;
  @Prop() initials: string;
  @Prop() icon = '👤';
  @Prop() color: string;
  @Prop() size: 'sm' | 'md' | 'lg' = 'md';
  @Prop() selected = false;
  @Prop() name: string;

  /** Set when the <img> fails to load so we fall back to initials/icon. */
  @State() imgError = false;

  @Watch('src')
  resetImgError() {
    // A new src deserves a fresh load attempt.
    this.imgError = false;
  }

  private renderContent() {
    if (this.src && !this.imgError) {
      return (
        <img
          src={this.src}
          alt={this.name || 'Avatar'}
          onError={() => (this.imgError = true)}
        />
      );
    }
    if (this.initials) {
      return <span>{this.initials}</span>;
    }
    return <span class="avatar-icon">{this.icon}</span>;
  }

  render() {
    return (
      <div
        class={{
          'avatar': true,
          [`avatar--${this.size}`]: true,
          'avatar--selected': this.selected,
        }}
        style={{ '--avatar-color': this.color }}
        title={this.name}
        role="img"
        aria-label={this.name || 'Avatar'}
      >
        {this.renderContent()}
      </div>
    );
  }
}
