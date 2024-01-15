import { Jest } from "../testing/Jest";

(async () => {
  await Jest.run();
})().catch(console.log);
