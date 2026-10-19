import { Component, Event, EventEmitter, Method, Prop, State, h } from '@stencil/core';

/**
 * A card with documented members.
 *
 * Second paragraph, with `code` and a {@link Prop} link.
 *
 * @slot - the card body
 * @part header - the header part
 * @deprecated use the other card
 */
@Component({ tag: 'docs-cmp' })
export class DocsCmp {
  /** One line. */
  @Prop() oneLine: string;

  /**
   * Many lines
   *   keep their indentation
   *
   * and blank lines.
   * @default 'x'
   * @since 1.2
   */
  @Prop() many: string = 'x';

  /** Same line as the tag @internal */
  @Prop() inlineTag: string;

  /**
   * @deprecated
   */
  @Prop() onlyTags: string;

  /** First comment. */
  /** Second comment wins both. */
  @Prop() twoComments: string;

  // not a JSDoc
  @Prop() lineComment: string;

  /* not a JSDoc either */
  @Prop() blockComment: string;

  /**
   Unstarred
   lines
   */
  @Prop() unstarred: string;

  /**
   * Text with an email a@b.com and @mention and trailing spaces.
   * Tag text spanning
   * @example
   * <docs-cmp></docs-cmp>
   *
   * ```tsx
   * <docs-cmp many="y" />
   * ```
   * @see https://stenciljs.com
   */
  @Prop() example: string;

  /** The getter docs. */
  @Prop()
  get both(): string {
    return 'a';
  }
  /** The setter docs. */
  set both(_v: string) {}

  /** Fired when something happens.
   * @since 2.0
   */
  @Event() happened: EventEmitter<string>;

  /**
   * Opens the card.
   * @param id the card id
   * @param {boolean} [force=false] force it open
   * @returns whether it opened
   */
  @Method()
  async open(id: string, force?: boolean): Promise<boolean> {
    return !!id && !!force;
  }

  /** State docs are not part of the metadata. */
  @State() hidden = false;

  render() {
    return <div />;
  }
}
