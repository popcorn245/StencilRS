import './load-card';
import './load-app';

// Interactive once the components are defined: on a server-rendered page each one has either
// hydrated (synchronously, as it upgraded) or is waiting for an event that will wake it.
(window as any).__interactive = performance.now();
