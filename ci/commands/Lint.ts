import { Linter } from "../linting/Linter";

(async () => {
  await Linter.run();
})().catch(console.log);
