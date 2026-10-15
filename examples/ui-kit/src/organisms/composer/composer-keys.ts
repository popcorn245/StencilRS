/**
 * localStorage keys the composer's mic press-hold popover persists, shared with
 * consumers (e.g. hub-chat) that read the selected mic device + talk-back state.
 * Kept in a separate module because a @Component() file may only export its
 * component class + types (Stencil module-bundling rule).
 */
export const MIC_DEVICE_KEY = 'hub:mic:deviceId';
export const TALKBACK_KEY = 'hub:talkback';
