import "./process-polyfill-mehh.js";

import { transform_code } from '../../../packages/transform-javascript/transform-javascript.js'
import { handleCalls } from '../../../packages/worker-typescript-magic/import-in-worker.js'

let commands = {
  /** @param {{ code: string }} data */
  "transform-code": async ({ code }) => {
    try {
      return transform_code(code, { filename: "worker.js" });
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(error.message);
      }
      throw error;
    }
  },
};

/**
 * @typedef Commands
 * @type {typeof commands}
 */

handleCalls(commands);
