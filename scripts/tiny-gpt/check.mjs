// Checks the browser port (src/interactives/tiny-gpt/model.ts) against
// PyTorch: same weights, same context, every logit compared.
//   node scripts/tiny-gpt/check.mjs
import { readFileSync } from "node:fs";
import { TinyGpt } from "../../src/interactives/tiny-gpt/model.ts";

const root = new URL("../../", import.meta.url);
const meta = JSON.parse(readFileSync(new URL("public/models/tiny-gpt/meta.json", root), "utf8"));
const bytes = readFileSync(new URL("public/models/tiny-gpt/weights.bin", root));
const fixture = JSON.parse(readFileSync(new URL("fixture.json", import.meta.url), "utf8"));

const model = new TinyGpt(meta, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
const started = performance.now();
const logits = model.nextLogits(model.encode(fixture.context));
const ms = performance.now() - started;

let worst = 0;
for (let i = 0; i < logits.length; i++) worst = Math.max(worst, Math.abs(logits[i] - fixture.logits[i]));
const argmax = (xs) => xs.reduce((best, x, i) => (x > xs[best] ? i : best), 0);
const same = argmax(Array.from(logits)) === argmax(fixture.logits);

let timed = performance.now();
for (let i = 0; i < 20; i++) model.nextLogits(model.encode(fixture.context.repeat(2)));
const perToken = (performance.now() - timed) / 20;

console.log(`largest logit difference vs PyTorch: ${worst.toExponential(2)}`);
console.log(`same most-likely next character: ${same} (${JSON.stringify(model.vocab[argmax(Array.from(logits))])})`);
console.log(`first call ${ms.toFixed(1)} ms; full 64-character context ${perToken.toFixed(1)} ms per character`);
if (worst > 1e-3 || !same) process.exit(1);
