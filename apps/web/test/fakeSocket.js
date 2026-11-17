/**
 * @fileoverview A controllable stand-in for the browser WebSocket. Tests
 * drive it with `open()`, `receive(event)` and `serverClose(code)`.
 */

export class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  /** @type {!Array<!FakeWebSocket>} Every socket created, oldest first. */
  static instances = [];

  /** @return {(!FakeWebSocket|undefined)} The newest socket. */
  static get latest() {
    return FakeWebSocket.instances.at(-1);
  }

  static reset() {
    FakeWebSocket.instances = [];
  }

  /** @param {string} url */
  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.CONNECTING;
    this.closedWith = null;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    FakeWebSocket.instances.push(this);
  }

  /** Called by the app. */
  close(code = 1000, reason = '') {
    if (this.readyState === FakeWebSocket.CLOSED) {
      return;
    }
    this.closedWith = {code, reason};
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({code, reason});
  }

  /** The server accepts the connection. */
  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.({});
  }

  /** The server sends an event. */
  receive(event) {
    this.onmessage?.({data: JSON.stringify(event)});
  }

  /** The server (or network) closes the connection. */
  serverClose(code, reason = '') {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({code, reason});
  }
}
