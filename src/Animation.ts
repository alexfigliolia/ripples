import { AutoIncrementingID } from "@figliolia/event-emitter";
import type { Callback } from "./types";

export class Animations {
  private static frame: number | null = null;
  private static IDs = new AutoIncrementingID();
  private static stack = new Map<string, Callback>();

  public static register(callback: Callback) {
    const ID = this.IDs.get();
    this.stack.set(ID, callback);
    void Promise.resolve().then(() => {
      this.nextFrame();
    });
    return ID;
  }

  public static delete(ID: string) {
    return this.stack.delete(ID);
  }

  private static nextFrame() {
    if (this.frame) {
      return;
    }
    this.animate();
  }

  private static animate() {
    this.frame = requestAnimationFrame(() => {
      if (!this.stack.size) {
        return this.closeLoop();
      }
      for (const [, callback] of this.stack) {
        callback();
      }
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
