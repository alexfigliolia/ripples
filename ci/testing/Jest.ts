import path from "path";
import { ChildProcess } from "@figliolia/child-process";

export class Jest {
  public static run() {
    return this.runTests().handler;
  }

  private static runTests() {
    const args = process.argv.slice(2);
    return new ChildProcess("jest" + args.join(" "), {
      stdio: "inherit",
      cwd: path.resolve(),
    });
  }
}
