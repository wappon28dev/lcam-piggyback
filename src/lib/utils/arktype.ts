/* eslint-disable perfectionist/sort-imports */
/* eslint-disable no-restricted-imports */

/// CONFIGURATION SIDE EFFECT START ///
// ref: https://arktype.io/docs/configuration#onundeclaredkey
// IMPORTANT: global config must be imported before importing anything from "arktype".

import "./arktype-config";
import { type } from "arktype";

/// CONFIGURATION SIDE EFFECT END ///

export { type };
