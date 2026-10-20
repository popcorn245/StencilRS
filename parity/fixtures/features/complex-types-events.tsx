import { Component, Event, EventEmitter, h } from '@stencil/core';

export interface NoteCardData {
  id: string;
  tags?: string[];
}

export type Mode = 'compact' | 'full';

export enum Level {
  Low,
  High,
}

@Component({ tag: 'pop-note-card' })
export class PopNoteCard {
  /** Fired when the note is picked. */
  @Event() picked: EventEmitter<NoteCardData>;
  @Event() moded: EventEmitter<Mode | undefined>;
  @Event() leveled: EventEmitter<Level>;
  @Event() listed: EventEmitter<NoteCardData[]>;
  @Event() pair: EventEmitter<[string, number]>;
  @Event() inline: EventEmitter<{ a: Mode; b?: number }>;
  @Event() plain: EventEmitter<void>;
  @Event() fn: EventEmitter<(note: NoteCardData) => void>;

  render() {
    return <div />;
  }
}
