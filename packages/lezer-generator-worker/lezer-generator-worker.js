import { MagicWorker } from '../../packages/worker-typescript-magic/worker-typescript-magic.js'
/**
 * @extends {MagicWorker<import("./lezer-generator-worker-worker.js").Commands>}
 */
export class LezerGeneratorWorker extends MagicWorker {
  constructor() {
    super(
      new Worker(
        new URL("./lezer-generator-worker-worker.js", import.meta.url),
        { type: "module" }
      )
    );
  }
}
