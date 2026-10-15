import { Component, Host, h, State, Event, EventEmitter, Method, Element, Prop } from '@stencil/core';

/**
 * pop-swipe-cards
 * A Tinder-style swipeable card interface for browsing article elements.
 */
@Component({
  tag: 'pop-swipe-cards',
  encapsulation: { type: 'shadow' },
  styleUrl: 'pop-swipe-cards.css',
})
export class PopSwipeCards {
  @Element() el: HTMLElement;

  /** Tracks which card is currently at the top of the stack. */
  @State() activeIndex: number = 0;

  /** When true, hides the built-in Yes/No control buttons. */
  @Prop() hideControls: boolean = false;

  /** Tracks the X-axis pixel delta during an active drag. */
  private currentX: number = 0;

  /** Tracks the Y-axis pixel delta for slight tilt/organic feel. */
  private currentY: number = 0;

  /** Disables CSS transitions during an active drag. */
  private isDragging: boolean = false;

  /** Prevents race conditions during transitions. */
  private isAnimating: boolean = false;

  /** Fired when a card is swiped right or the "Yes" button is clicked. */
  @Event() popSwipeYes: EventEmitter<{ element: HTMLElement; index: number }>;

  /** Fired when a card is swiped left or the "No" button is clicked. */
  @Event() popSwipeNo: EventEmitter<{ element: HTMLElement; index: number }>;

  private startX: number = 0;
  private startY: number = 0;
  private threshold: number = 100;
  private cards: HTMLElement[] = [];
  private deckContainerRef: HTMLDivElement;

  componentDidLoad() {
    this.initDeck();
  }

  /**
   * Parses the slotted article tags, applies necessary z-index to stack them,
   * and resets the activeIndex.
   */
  @Method()
  async init(): Promise<void> {
    this.initDeck();
  }

  /**
   * Programmatically triggers a "Yes" (right) swipe on the currently active card.
   */
  @Method()
  async swipeYes(): Promise<void> {
    if (this.activeIndex >= this.cards.length || this.isAnimating) return;
    this.completeSwipe('yes');
  }

  /**
   * Programmatically triggers a "No" (left) swipe on the currently active card.
   */
  @Method()
  async swipeNo(): Promise<void> {
    if (this.activeIndex >= this.cards.length || this.isAnimating) return;
    this.completeSwipe('no');
  }

  /**
   * Resets the deck to the initial state.
   */
  @Method()
  async reset(): Promise<void> {
    this.initDeck();
  }

  private initDeck(): void {
    const slot = this.el.shadowRoot?.querySelector('slot');
    if (!slot) return;
    const assignedElements = slot.assignedElements({ flatten: true }) as HTMLElement[];
    this.cards = assignedElements.filter(el => el.tagName.toLowerCase() === 'article');

    this.cards.forEach((card, index) => {
      // Reset all inline styles that may have been set during swipe animations
      card.style.transform = '';
      card.style.opacity = '';
      card.style.pointerEvents = '';
      card.style.transition = '';
      card.style.margin = '0';
      card.style.zIndex = `${this.cards.length - index}`;
      card.classList.remove('top-card', 'swiped-yes', 'swiped-no');
    });

    this.activeIndex = 0;
    this.updateTopCard();
  }

  private updateTopCard() {
    this.cards.forEach((card, index) => {
      const stackDepth = index - this.activeIndex;

      // Cards that have already been swiped — leave their fly-off styles intact
      if (stackDepth < 0) {
        card.classList.remove('top-card');
        return;
      }

      if (stackDepth === 0) {
        card.classList.add('top-card');
        card.style.transition = '';
        card.style.transform = '';
        card.style.opacity = '1';
      } else {
        card.classList.remove('top-card');
        // Visual stack offset: slight scale down and shift down
        const offset = Math.min(stackDepth, 3);
        const scale = 1 - (offset * 0.04);
        const translateY = offset * 12;

        card.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.5s ease-out';
        card.style.transform = `scale(${scale}) translateY(${translateY}px)`;
        card.style.opacity = '1';
      }
    });
  }

  private handleDown(ev: PointerEvent) {
    if (this.activeIndex >= this.cards.length || this.isAnimating) return;
    this.isDragging = true;
    this.startX = ev.clientX;
    this.startY = ev.clientY;

    const topCard = this.cards[this.activeIndex];
    if (topCard) {
      topCard.style.transition = 'none'; // Disable transition for 1:1 dragging
    }

    // Capture on the container so pointermove fires reliably even when the
    // pointer moves outside the element bounds
    this.deckContainerRef?.setPointerCapture(ev.pointerId);
  }

  private handleMove(ev: PointerEvent) {
    if (!this.isDragging) return;
    this.currentX = ev.clientX - this.startX;
    this.currentY = ev.clientY - this.startY;

    const topCard = this.cards[this.activeIndex];
    if (topCard) {
      const rotation = this.currentX / 10; // Simple ratio for tilt
      topCard.style.transform = `translate3d(${this.currentX}px, ${this.currentY}px, 0) rotate(${rotation}deg)`;
    }
  }

  private handleUp(_ev: PointerEvent) {
    if (!this.isDragging) return;
    this.isDragging = false;

    if (Math.abs(this.currentX) > this.threshold) {
      this.completeSwipe(this.currentX > 0 ? 'yes' : 'no');
    } else {
      this.snapBack();
    }

    this.currentX = 0;
    this.currentY = 0;
  }

  private snapBack() {
    this.isAnimating = true;
    const topCard = this.cards[this.activeIndex];
    if (topCard) {
      // Re-enable transition for the snap-back animation
      topCard.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease-out';
      topCard.style.transform = '';
    }

    setTimeout(() => {
      this.isAnimating = false;
    }, 400);
  }

  private completeSwipe(direction: 'yes' | 'no') {
    const index = this.activeIndex;
    const card = this.cards[index];

    if (!card) return;

    const endY = this.currentY || 0;
    const xOffset = direction === 'yes' ? window.innerWidth * 1.5 : -window.innerWidth * 1.5;
    const rotation = direction === 'yes' ? 30 : -30;

    card.classList.add(direction === 'yes' ? 'swiped-yes' : 'swiped-no');

    // Enable transitions, force a reflow to arm them, then set the end state
    card.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.5s ease-out';
    void card.offsetWidth;
    card.style.transform = `translate3d(${xOffset}px, ${endY}px, 0) rotate(${rotation}deg)`;
    card.style.opacity = '0';
    card.style.pointerEvents = 'none';

    if (direction === 'yes') {
      this.popSwipeYes.emit({ element: card, index });
    } else {
      this.popSwipeNo.emit({ element: card, index });
    }

    this.isAnimating = true;

    // 510ms: just past the 0.5s fly-off transition to avoid a z-index flash
    setTimeout(() => {
      this.activeIndex++;
      this.updateTopCard();
      this.isAnimating = false;
    }, 510);
  }

  render() {
    return (
      <Host>
        <div
          class="deck-container"
          ref={el => (this.deckContainerRef = el as HTMLDivElement)}
          onPointerDown={(e) => this.handleDown(e)}
          onPointerMove={(e) => this.handleMove(e)}
          onPointerUp={(e) => this.handleUp(e)}
          onPointerCancel={(e) => this.handleUp(e)}
        >
          <slot onSlotchange={() => this.initDeck()}></slot>
        </div>
        {!this.hideControls && (
          <div class="controls" part="controls">
            <button class="control-btn no-btn" onClick={() => this.swipeNo()} aria-label="Swipe left (No)">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
            <button class="control-btn yes-btn" onClick={() => this.swipeYes()} aria-label="Swipe right (Yes)">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </button>
          </div>
        )}
      </Host>
    );
  }
}
