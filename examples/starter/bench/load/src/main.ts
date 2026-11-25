import './load-card';
import './load-app';

// The page's inline loader (see runtime-server.js) marks it interactive first; without one, it
// is once the components are defined: each has either hydrated or waits for an event to wake it.
(window as any).__interactive ??= performance.now();
