import { Component, h, Prop, State, Event, EventEmitter, Watch } from '@stencil/core';

@Component({
  tag: 'pop-celebration',
  encapsulation: { type: 'scoped' },
  styleUrl: 'celebration.css',
})
export class PopCelebration {
  /** Trigger the animation */
  @Prop() active: boolean = false;

  /** Points earned (displayed in animation) */
  @Prop() points: number = 0;

  /** Celebration message */
  @Prop() message: string = 'Quest Complete!';

  /** Animation finished */
  @Event({ composed: true, bubbles: true }) celebrationDone: EventEmitter<void>;

  @State() visible: boolean = false;
  @State() displayedPoints: number = 0;

  private dismissTimer?: ReturnType<typeof setTimeout>;
  private counterTimer?: ReturnType<typeof setInterval>;
  private confettiPieces: { x: number; y: number; rotation: number; color: string; delay: number; size: number }[] = [];

  @Watch('active')
  onActiveChange(isActive: boolean) {
    if (isActive) {
      this.startCelebration();
    }
  }

  componentWillLoad() {
    if (this.active) {
      this.startCelebration();
    }
  }

  disconnectedCallback() {
    this.cleanup();
  }

  private startCelebration() {
    this.visible = true;
    this.displayedPoints = 0;
    this.generateConfetti();

    // Animate counter
    if (this.points > 0) {
      const steps = Math.min(this.points, 30);
      const increment = this.points / steps;
      let current = 0;
      this.counterTimer = setInterval(() => {
        current += increment;
        if (current >= this.points) {
          this.displayedPoints = this.points;
          clearInterval(this.counterTimer!);
        } else {
          this.displayedPoints = Math.round(current);
        }
      }, 60);
    }

    // Auto-dismiss after 3s
    this.dismissTimer = setTimeout(() => {
      this.dismiss();
    }, 3000);
  }

  private generateConfetti() {
    const colors = ['#a855f7', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#ec4899'];
    this.confettiPieces = Array.from({ length: 40 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * -50 - 10,
      rotation: Math.random() * 360,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
      size: 6 + Math.random() * 6,
    }));
  }

  private dismiss = () => {
    this.cleanup();
    this.visible = false;
    this.celebrationDone.emit();
  };

  private cleanup() {
    if (this.dismissTimer) clearTimeout(this.dismissTimer);
    if (this.counterTimer) clearInterval(this.counterTimer);
  }

  render() {
    if (!this.visible) return null;

    return (
      <div class="cel-overlay" onClick={this.dismiss}>
        {/* Confetti */}
        <div class="cel-confetti">
          {this.confettiPieces.map((piece, i) => (
            <div
              key={i}
              class="cel-piece"
              style={{
                left: `${piece.x}%`,
                top: `${piece.y}%`,
                width: `${piece.size}px`,
                height: `${piece.size}px`,
                backgroundColor: piece.color,
                transform: `rotate(${piece.rotation}deg)`,
                animationDelay: `${piece.delay}s`,
              }}
            />
          ))}
        </div>

        {/* Message */}
        <div class="cel-content">
          <div class="cel-emoji">🎉</div>
          <h2 class="cel-message">{this.message}</h2>
          {this.points > 0 && (
            <div class="cel-points">
              <span class="cel-coin">🪙</span>
              <span class="cel-points-value">+{this.displayedPoints}</span>
              <span class="cel-points-label">Popcoins</span>
            </div>
          )}
          <p class="cel-tap-hint">Tap to dismiss</p>
        </div>
      </div>
    );
  }
}
