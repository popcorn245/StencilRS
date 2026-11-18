import { Component, Event, EventEmitter, Method, Prop, h } from '@stencil/core';
import type { ComponentProps, ComponentRef, OverlayEventDetail } from '../interface';

@Component({ tag: 'build-nav-link' })
export class BuildNavLink {
  @Prop() component?: ComponentRef;
  @Prop() componentProps?: ComponentProps;
  @Prop() handler?: Function;
  @Prop() typed?: ComponentProps<string>;
  @Method() async setRoot(root: ComponentRef, props?: ComponentProps): Promise<boolean> {
    return !!root && !!props;
  }
  @Prop() detail?: OverlayEventDetail;
  @Prop() detailOf?: OverlayEventDetail<string>;
  @Prop() custom?: CustomEvent;
  @Prop() customOf?: CustomEvent<string>;
  @Prop() refs?: ComponentRef[];
  @Event() navChange!: EventEmitter<OverlayEventDetail>;
  @Event() navProps!: EventEmitter<ComponentProps>;
  render() {
    return <div />;
  }
}
