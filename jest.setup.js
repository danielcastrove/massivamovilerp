import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock PointerEvent
if (!global.PointerEvent) {
  class PointerEvent extends MouseEvent {
    constructor(type, props = {}) {
      super(type, props);
      this.pointerId = props.pointerId || 0;
      this.pointerType = props.pointerType || '';
    }
  }
  global.PointerEvent = PointerEvent;
}

// Mock releasePointerCapture and hasPointerCapture
window.HTMLElement.prototype.releasePointerCapture = jest.fn();
window.HTMLElement.prototype.hasPointerCapture = jest.fn();
