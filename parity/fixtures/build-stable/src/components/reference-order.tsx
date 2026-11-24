import { Component, Method, h } from '@stencil/core';
import { Box, Callback, Direction, Entry, HookResult, Item, Kind, Level, Row, Size, Zed } from '../types';

/** Return types the checker prints differently from how they are written: the order of `references` is Stencil's. */
@Component({ tag: 'stable-reference-order' })
export class StableReferenceOrder {
  @Method()
  async r0(z: Zed, row?: Row): Promise<Item | null> {
    return null as any;
  }
  @Method()
  async r1(z: Zed, row?: Row): Promise<Size | 'huge'> {
    return null as any;
  }
  @Method()
  async r2(z: Zed, row?: Row): Promise<Entry | null> {
    return null as any;
  }
  @Method()
  async r3(z: Zed, row?: Row): Promise<Array<Item | null>> {
    return null as any;
  }
  @Method()
  async r4(z: Zed, row?: Row): Promise<Item | Zed | undefined> {
    return null as any;
  }
  @Method()
  async r5(z: Zed, row?: Row): Promise<{ item: Item | null; z: Zed }> {
    return null as any;
  }
  @Method()
  async r6(z: Zed, row?: Row): Promise<Box<Item>> {
    return null as any;
  }
  @Method()
  async r7(z: Zed, row?: Row): Promise<Box> {
    return null as any;
  }
  @Method()
  async r8(z: Zed, row?: Row): Promise<HookResult> {
    return null as any;
  }
  @Method()
  async r9(z: Zed, row?: Row): Promise<HookResult | undefined> {
    return null as any;
  }
  @Method()
  async r10(z: Zed, row?: Row): Promise<Level.Low | Level> {
    return null as any;
  }
  @Method()
  async r11(z: Zed, row?: Row): Promise<Record<string, Item | null>> {
    return null as any;
  }
  @Method()
  async r12(z: Zed, row?: Row): Promise<Callback | null> {
    return null as any;
  }
  @Method()
  async r13(z: Zed, row?: Row): Promise<(v: Entry) => Size> {
    return null as any;
  }
  @Method()
  async r14(z: Zed, row?: Row): Promise<{ e: Entry | null }> {
    return null as any;
  }
  @Method()
  async r15(z: Zed, row?: Row): Promise<Item[] | Row[]> {
    return null as any;
  }
  @Method()
  async r16(z: Zed, row?: Row): Promise<Readonly<Item> | null> {
    return null as any;
  }
  @Method()
  async r17(z: Zed, row?: Row): Promise<Partial<Item>> {
    return null as any;
  }
  @Method()
  async r18(z: Zed, row?: Row): Promise<Size[]> {
    return null as any;
  }
  @Method()
  async r19(z: Zed, row?: Row): Promise<Array<Size>> {
    return null as any;
  }
  @Method()
  async r20(z: Zed, row?: Row): Promise<Promise<Item>> {
    return null as any;
  }
  @Method()
  async r21(z: Zed, row?: Row): Promise<keyof Item> {
    return null as any;
  }
  @Method()
  async r22(z: Zed, row?: Row): Promise<Item['id']> {
    return null as any;
  }
  @Method()
  async r23(z: Zed, row?: Row): Promise<Zed & Item> {
    return null as any;
  }
  @Method()
  async r24(z: Zed, row?: Row): Promise<Kind | Level> {
    return null as any;
  }
  @Method()
  async r25(z: Zed, row?: Row): Promise<Size | Direction> {
    return null as any;
  }
  @Method()
  async r26(z: Zed, row?: Row): Promise<{ s: Size; d: Direction | null }[]> {
    return null as any;
  }
  @Method()
  async r27(z: Zed, row?: Row): Promise<Map<Entry, Size | null>> {
    return null as any;
  }
  @Method()
  async r28(z: Zed, row?: Row): Promise<[Entry, Size | null]> {
    return null as any;
  }
  @Method()
  async r29(z: Zed, row?: Row): Promise<{ cb: (e: Entry | null) => Size | null }> {
    return null as any;
  }
  @Method()
  async r30(z: Zed, row?: Row): Promise<Set<Size | 'huge'>> {
    return null as any;
  }
  @Method()
  async r31(z: Zed, row?: Row): Promise<Entry | Size> {
    return null as any;
  }
  @Method()
  async r32(z: Zed, row?: Row): Promise<Level | null> {
    return null as any;
  }
  render() {
    return <div />;
  }
}
