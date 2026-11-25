// Experimental: the stencilrs runtime (componentExport 'stencilrs'). Compiled code calls these;
// components import only the Stencil-compatible helpers below.
export declare const Build: { isBrowser: boolean; isServer: boolean; isDev: boolean; isTesting: boolean };
export declare function forceUpdate(ref: any): void;
export declare function getElement(ref: any): HTMLElement;
export declare function writeTask(cb: FrameRequestCallback): number;
export declare function readTask(cb: FrameRequestCallback): number;
export declare function getAssetPath(path: string): string;
