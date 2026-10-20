/**
 * Koji's nanoGPT (~/Desktop/nanoGPT), running in the browser.
 *
 * A line-for-line port of the PyTorch forward pass, so the page runs the
 * exact model that was trained, from its exported weights:
 *
 *   x = token_embedding[id] + position_embedding[t]
 *   for each Block:  x = x + MultiHeadAttention(LayerNorm(x))
 *                    x = x + FeedForward(LayerNorm(x))
 *   logits = lm_head(LayerNorm(x))
 *
 * Each attention Head is causal (a position only looks back) and scales its
 * scores by head_size^-0.5; FeedForward is Linear(64→256), ReLU,
 * Linear(256→64). nn.Linear weights are stored [out, in], so y = x·Wᵀ + b.
 *
 * Only plain type annotations here, so Node can run this file directly for
 * the check against PyTorch (scripts/tiny-gpt/check.mjs).
 */

export type TensorEntry = { name: string; shape: number[]; offset: number; length: number };

export type TinyGptMeta = {
  format: "float16";
  config: { vocab_size: number; n_embd: number; n_head: number; n_layer: number; block_size: number };
  vocab: string;
  parameters: number;
  training: {
    text: string;
    characters: number;
    steps: number;
    history: { step: number; train: number; val: number }[];
  };
  tensors: TensorEntry[];
};

type Layer = {
  ln1w: Float32Array;
  ln1b: Float32Array;
  /** One [head_size × n_embd] matrix per head, for keys, queries and values. */
  key: Float32Array[];
  query: Float32Array[];
  value: Float32Array[];
  projW: Float32Array;
  projB: Float32Array;
  ln2w: Float32Array;
  ln2b: Float32Array;
  ff1W: Float32Array;
  ff1B: Float32Array;
  ff2W: Float32Array;
  ff2B: Float32Array;
};

/** IEEE 754 half precision bits to a number. */
function halfToFloat(bits: number): number {
  const sign = bits & 0x8000 ? -1 : 1;
  const exponent = (bits >> 10) & 0x1f;
  const fraction = bits & 0x3ff;
  if (exponent === 0) return sign * 2 ** -14 * (fraction / 1024);
  if (exponent === 31) return fraction ? NaN : sign * Infinity;
  return sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
}

/** out[o] = b[o] + Σ_i x[i]·W[o, i], for one input row. */
function linear(x: Float32Array, xOffset: number, inDim: number, W: Float32Array, b: Float32Array | null, outDim: number, out: Float32Array, outOffset: number) {
  for (let o = 0; o < outDim; o++) {
    let sum = b ? b[o] : 0;
    const row = o * inDim;
    for (let i = 0; i < inDim; i++) sum += x[xOffset + i] * W[row + i];
    out[outOffset + o] = sum;
  }
}

function layerNorm(x: Float32Array, rows: number, dim: number, w: Float32Array, b: Float32Array, out: Float32Array) {
  for (let r = 0; r < rows; r++) {
    const base = r * dim;
    let mean = 0;
    for (let i = 0; i < dim; i++) mean += x[base + i];
    mean /= dim;
    let variance = 0;
    for (let i = 0; i < dim; i++) {
      const d = x[base + i] - mean;
      variance += d * d;
    }
    variance /= dim;
    const inv = 1 / Math.sqrt(variance + 1e-5); // nn.LayerNorm's default eps
    for (let i = 0; i < dim; i++) out[base + i] = (x[base + i] - mean) * inv * w[i] + b[i];
  }
}

export class TinyGpt {
  readonly meta: TinyGptMeta;
  readonly vocab: string[];
  private readonly index: Map<string, number>;
  private readonly tok: Float32Array;
  private readonly pos: Float32Array;
  private readonly layers: Layer[];
  private readonly lnfW: Float32Array;
  private readonly lnfB: Float32Array;
  private readonly lmW: Float32Array;
  private readonly lmB: Float32Array;

  constructor(meta: TinyGptMeta, weights: ArrayBuffer) {
    this.meta = meta;
    this.vocab = Array.from(meta.vocab);
    this.index = new Map(this.vocab.map((ch, i) => [ch, i]));

    const bits = new Uint16Array(weights);
    const tensors = new Map<string, Float32Array>();
    for (const t of meta.tensors) {
      const values = new Float32Array(t.length);
      for (let i = 0; i < t.length; i++) values[i] = halfToFloat(bits[t.offset + i]);
      tensors.set(t.name, values);
    }
    const get = (name: string) => {
      const value = tensors.get(name);
      if (!value) throw new Error(`Missing tensor ${name}`);
      return value;
    };

    const { n_layer, n_head } = meta.config;
    this.tok = get("token_embedding_table.weight");
    this.pos = get("position_embedding_table.weight");
    this.layers = Array.from({ length: n_layer }, (_, l) => {
      const p = `blocks.${l}`;
      const heads = (kind: string) => Array.from({ length: n_head }, (_, h) => get(`${p}.sa.heads.${h}.${kind}.weight`));
      return {
        ln1w: get(`${p}.ln1.weight`),
        ln1b: get(`${p}.ln1.bias`),
        key: heads("key"),
        query: heads("query"),
        value: heads("value"),
        projW: get(`${p}.sa.proj.weight`),
        projB: get(`${p}.sa.proj.bias`),
        ln2w: get(`${p}.ln2.weight`),
        ln2b: get(`${p}.ln2.bias`),
        ff1W: get(`${p}.ffwd.net.0.weight`),
        ff1B: get(`${p}.ffwd.net.0.bias`),
        ff2W: get(`${p}.ffwd.net.2.weight`),
        ff2B: get(`${p}.ffwd.net.2.bias`),
      };
    });
    this.lnfW = get("ln_f.weight");
    this.lnfB = get("ln_f.bias");
    this.lmW = get("lm_head.weight");
    this.lmB = get("lm_head.bias");
  }

  /** Fetches the exported model from `base` (e.g. "/models/tiny-gpt"). */
  static async load(base: string, signal?: AbortSignal): Promise<TinyGpt> {
    const [meta, weights] = await Promise.all([
      fetch(`${base}/meta.json`, { signal }).then((r) => {
        if (!r.ok) throw new Error(`meta.json: HTTP ${r.status}`);
        return r.json() as Promise<TinyGptMeta>;
      }),
      fetch(`${base}/weights.bin`, { signal }).then((r) => {
        if (!r.ok) throw new Error(`weights.bin: HTTP ${r.status}`);
        return r.arrayBuffer();
      }),
    ]);
    return new TinyGpt(meta, weights);
  }

  /** Characters the model never saw are dropped, as the tokenizer cannot encode them. */
  encode(text: string): number[] {
    const ids: number[] = [];
    for (const ch of text) {
      const id = this.index.get(ch);
      if (id !== undefined) ids.push(id);
    }
    return ids;
  }

  knows(ch: string): boolean {
    return this.index.has(ch);
  }

  /** Logits for the character after `ids` (only its last block_size characters are read). */
  nextLogits(ids: number[]): Float32Array {
    const { n_embd: C, n_head, block_size, vocab_size } = this.meta.config;
    const context = ids.slice(-block_size);
    const T = context.length;
    const hs = C / n_head;
    const scale = hs ** -0.5;

    const x = new Float32Array(T * C);
    for (let t = 0; t < T; t++) {
      for (let c = 0; c < C; c++) x[t * C + c] = this.tok[context[t] * C + c] + this.pos[t * C + c];
    }

    const normed = new Float32Array(T * C);
    const k = new Float32Array(T * hs);
    const q = new Float32Array(T * hs);
    const v = new Float32Array(T * hs);
    const heads = new Float32Array(T * C);
    const projected = new Float32Array(C);
    const scores = new Float32Array(T);
    const hidden = new Float32Array(4 * C);
    const ffOut = new Float32Array(C);

    for (const layer of this.layers) {
      // x = x + sa(ln1(x))
      layerNorm(x, T, C, layer.ln1w, layer.ln1b, normed);
      for (let h = 0; h < n_head; h++) {
        for (let t = 0; t < T; t++) {
          linear(normed, t * C, C, layer.key[h], null, hs, k, t * hs);
          linear(normed, t * C, C, layer.query[h], null, hs, q, t * hs);
          linear(normed, t * C, C, layer.value[h], null, hs, v, t * hs);
        }
        for (let t = 0; t < T; t++) {
          // Causal: position t attends to 0..t only.
          let max = -Infinity;
          for (let s = 0; s <= t; s++) {
            let dot = 0;
            for (let i = 0; i < hs; i++) dot += q[t * hs + i] * k[s * hs + i];
            scores[s] = dot * scale;
            if (scores[s] > max) max = scores[s];
          }
          let total = 0;
          for (let s = 0; s <= t; s++) {
            scores[s] = Math.exp(scores[s] - max);
            total += scores[s];
          }
          for (let i = 0; i < hs; i++) {
            let sum = 0;
            for (let s = 0; s <= t; s++) sum += scores[s] * v[s * hs + i];
            heads[t * C + h * hs + i] = sum / total; // torch.cat(heads, dim=-1)
          }
        }
      }
      for (let t = 0; t < T; t++) {
        linear(heads, t * C, C, layer.projW, layer.projB, C, projected, 0);
        for (let c = 0; c < C; c++) x[t * C + c] += projected[c];
      }

      // x = x + ffwd(ln2(x))
      layerNorm(x, T, C, layer.ln2w, layer.ln2b, normed);
      for (let t = 0; t < T; t++) {
        linear(normed, t * C, C, layer.ff1W, layer.ff1B, 4 * C, hidden, 0);
        for (let i = 0; i < 4 * C; i++) if (hidden[i] < 0) hidden[i] = 0; // ReLU
        linear(hidden, 0, 4 * C, layer.ff2W, layer.ff2B, C, ffOut, 0);
        for (let c = 0; c < C; c++) x[t * C + c] += ffOut[c];
      }
    }

    // Only the last position is needed for the next character.
    const last = new Float32Array(C);
    layerNorm(x.subarray((T - 1) * C, T * C), 1, C, this.lnfW, this.lnfB, last);
    const logits = new Float32Array(vocab_size);
    linear(last, 0, C, this.lmW, this.lmB, vocab_size, logits, 0);
    return logits;
  }
}

/** softmax(logits / temperature). */
export function probabilities(logits: Float32Array, temperature: number): Float32Array {
  const t = Math.max(temperature, 1e-3);
  let max = -Infinity;
  for (const value of logits) if (value / t > max) max = value / t;
  const probs = new Float32Array(logits.length);
  let total = 0;
  for (let i = 0; i < logits.length; i++) {
    probs[i] = Math.exp(logits[i] / t - max);
    total += probs[i];
  }
  for (let i = 0; i < probs.length; i++) probs[i] /= total;
  return probs;
}

/** torch.multinomial for one sample: draws an index with the given probabilities. */
export function sample(probs: Float32Array, random: number): number {
  let cumulative = 0;
  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i];
    if (random < cumulative) return i;
  }
  return probs.length - 1;
}
