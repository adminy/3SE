import { MagicWorker } from '../../../packages/worker-typescript-magic/worker-typescript-magic.js'

/**
 * @extends {MagicWorker<import("./transform-javascript-worker-worker.js").Commands>}
 */
export class TransformJavascriptWorker extends MagicWorker {
  constructor() {
    super(
      new Worker(
        new URL("./transform-javascript-worker-worker.js", import.meta.url),
        {
          type: "module",
        }
      )
    );
  }
}
