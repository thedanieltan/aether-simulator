export function seededRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return function next() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

export function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function pick(random, values) {
  return values[Math.floor(random() * values.length)];
}

export function stableId(prefix, value) {
  return `${prefix}-${fnv1a(value).toString(16).padStart(8, "0")}`;
}
