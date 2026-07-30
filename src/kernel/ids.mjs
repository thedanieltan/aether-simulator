import { sha256 as digestSha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { canonicalCompactJson } from "../canonical-json.mjs";

const ID_NAMESPACE = /^[a-z][a-z0-9-]*$/;
const TWO_TO_52 = 4503599627370496;

export function sha256(value) {
  const input = typeof value === "string" ? value : canonicalCompactJson(value);
  return bytesToHex(digestSha256(new TextEncoder().encode(input)));
}

export function stableId(namespace, value) {
  if (!ID_NAMESPACE.test(namespace)) {
    throw new TypeError(`invalid identifier namespace: ${namespace}`);
  }
  return `${namespace}_${sha256(value).slice(0, 32)}`;
}

export function createRandomSubstream({
  rootSeed,
  moduleId,
  entityId = "world",
  purpose,
}) {
  if (!moduleId || !purpose) {
    throw new TypeError("moduleId and purpose are required for a random substream");
  }
  const namespace = { root_seed: String(rootSeed), module_id: moduleId, entity_id: entityId, purpose };
  let counter = 0;

  function next() {
    const digest = sha256({ ...namespace, counter });
    counter += 1;
    return Number.parseInt(digest.slice(0, 13), 16) / TWO_TO_52;
  }

  return Object.freeze({
    next,
    integer(minimum, maximum) {
      if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum) || maximum < minimum) {
        throw new TypeError("integer bounds must be safe integers with maximum >= minimum");
      }
      return minimum + Math.floor(next() * (maximum - minimum + 1));
    },
    pick(values) {
      if (!Array.isArray(values) || values.length === 0) {
        throw new TypeError("pick requires a non-empty array");
      }
      return values[Math.floor(next() * values.length)];
    },
    snapshot() {
      return { ...namespace, counter };
    },
  });
}
