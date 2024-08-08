import { Subscriptable } from "@figliolia/event-emitter";
import type { Callback } from "./types";

export class Animations {
  private static frame: number | null = null;
  private static callstack = new Subscriptable<Callback>();

  public static register(callback: Callback) {
    const ID = this.callstack.register(callback);
    void Promise.resolve().then(() => {
      this.nextFrame();
    });
    return ID;
  }

  public static delete(ID: string) {
    return this.callstack.remove(ID);
  }

  private static nextFrame() {
    if (this.frame) {
      return;
    }
    this.animate();
  }

  private static animate() {
    this.frame = requestAnimationFrame(() => {
      if (!this.callstack.length) {
        return this.closeLoop();
      }
      this.callstack.execute();
      this.animate();
    });
  }

  private static closeLoop() {
    if (this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }
}
