"""
Trains Koji's nanoGPT (the classes in ~/Desktop/nanoGPT, unchanged) on
Shakespeare and exports it for the site, where src/interactives/tiny-gpt
runs it in the browser.

    ~/Desktop/nanoGPT/venv/bin/python scripts/tiny-gpt/train_export.py \
        --nanogpt ~/Desktop/nanoGPT

Writes:
    public/models/tiny-gpt/weights.bin   every parameter, float16, in `tensors` order
    public/models/tiny-gpt/meta.json     config, vocabulary, tensor table, losses
    src/interactives/tiny-gpt/model-card.json   the numbers the page prints
    scripts/tiny-gpt/fixture.json        a context and PyTorch's logits for it, so
                                         the TypeScript port can be checked exactly
    <nanogpt>/shakespeare-web.pt         the PyTorch checkpoint, for re-exporting
"""

import argparse
import json
import sys
import time
from array import array
from pathlib import Path

import torch

parser = argparse.ArgumentParser()
parser.add_argument("--nanogpt", required=True, help="folder with BigramLanguageModel.py and shakespeare.txt")
parser.add_argument("--steps", type=int, default=5000)
args = parser.parse_args()

nanogpt = Path(args.nanogpt).expanduser().resolve()
sys.path.insert(0, str(nanogpt))
from BigramLanguageModel import BigramLanguageModel  # noqa: E402  (Koji's model)

repo = Path(__file__).resolve().parents[2]
out_dir = repo / "public" / "models" / "tiny-gpt"
out_dir.mkdir(parents=True, exist_ok=True)

# Koji's gpt.py settings, with a longer context and more steps.
batch_size = 16
block_size = 64
max_iters = args.steps
eval_interval = 500
learning_rate = 1e-3
eval_iters = 200
n_embd = 64
n_head = 4
n_layer = 4
dropout = 0.0
device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"

torch.manual_seed(1337)

text = (nanogpt / "shakespeare.txt").read_text(encoding="utf-8")
chars = sorted(set(text))
vocab_size = len(chars)
stoi = {ch: i for i, ch in enumerate(chars)}

data = torch.tensor([stoi[c] for c in text], dtype=torch.long)
n = int(0.9 * len(data))
train_data, val_data = data[:n], data[n:]


def get_batch(split):
    source = train_data if split == "train" else val_data
    ix = torch.randint(len(source) - block_size, (batch_size,))
    x = torch.stack([source[i : i + block_size] for i in ix])
    y = torch.stack([source[i + 1 : i + block_size + 1] for i in ix])
    return x.to(device), y.to(device)


@torch.no_grad()
def estimate_loss(model):
    out = {}
    model.eval()
    for split in ["train", "val"]:
        losses = torch.zeros(eval_iters)
        for k in range(eval_iters):
            X, Y = get_batch(split)
            _, loss = model(X, Y)
            losses[k] = loss.item()
        out[split] = losses.mean().item()
    model.train()
    return out


model = BigramLanguageModel(vocab_size, n_embd, block_size, n_head, n_layer, device, dropout).to(device)
params = sum(p.numel() for p in model.parameters())
print(f"{params:,} parameters on {device}", flush=True)

optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)
history = []
started = time.time()
for it in range(max_iters):
    if it % eval_interval == 0 or it == max_iters - 1:
        losses = estimate_loss(model)
        history.append({"step": it, **losses})
        print(f"step {it}: train {losses['train']:.4f}, val {losses['val']:.4f}  ({time.time() - started:.0f}s)", flush=True)
    xb, yb = get_batch("train")
    _, loss = model(xb, yb)
    optimizer.zero_grad(set_to_none=True)
    loss.backward()
    optimizer.step()

model = model.to("cpu").eval()
torch.save(model.state_dict(), nanogpt / "shakespeare-web.pt")

# --- Export -----------------------------------------------------------------
# Every parameter in state_dict order (buffers such as the causal mask are
# rebuilt in the browser), as float16. nn.Linear weights stay [out, in].
state = model.state_dict()
tensors, blobs, offset = [], [], 0
for name, tensor in state.items():
    if name.endswith(".tril"):
        continue
    half = tensor.detach().half().contiguous()
    bits = array("h", half.view(torch.int16).flatten().tolist())  # raw float16 bits
    if sys.byteorder != "little":
        bits.byteswap()
    tensors.append({"name": name, "shape": list(half.shape), "offset": offset, "length": half.numel()})
    blobs.append(bits.tobytes())
    offset += half.numel()
(out_dir / "weights.bin").write_bytes(b"".join(blobs))

meta = {
    "format": "float16",
    "config": {"vocab_size": vocab_size, "n_embd": n_embd, "n_head": n_head, "n_layer": n_layer, "block_size": block_size},
    "vocab": "".join(chars),
    "parameters": params,
    "training": {"text": "Tiny Shakespeare", "characters": len(text), "steps": max_iters, "history": history},
    "tensors": tensors,
}
(out_dir / "meta.json").write_text(json.dumps(meta))

# The few numbers the page prints (section details, playground footer), small
# enough to bundle so they are right from the first render.
card = {
    "parameters": params,
    "bytes": offset * 2,
    **meta["config"],
    "steps": max_iters,
    "characters": len(text),
    "valLoss": round(history[-1]["val"], 2),
    "seconds": round(time.time() - started),
}
(repo / "src" / "interactives" / "tiny-gpt" / "model-card.json").write_text(json.dumps(card, indent=2) + "\n")

# --- Fixture for the TypeScript port -----------------------------------------
# Logits for the last position of a context, computed from the float16 weights
# the browser will see, so the comparison is exact rather than approximate.
with torch.no_grad():
    for p in model.parameters():
        p.copy_(p.half().float())
    context = "ROMEO:\nWhat light through yonder window breaks"
    idx = torch.tensor([[stoi[c] for c in context[-block_size:]]], dtype=torch.long)
    logits, _ = model(idx)
fixture = {"context": context, "logits": logits[0, -1].tolist()}
(Path(__file__).resolve().parent / "fixture.json").write_text(json.dumps(fixture))

sample_ctx = torch.tensor([[stoi["\n"]]], dtype=torch.long)
torch.manual_seed(7)
print("\n--- sample ---")
print("".join(chars[i] for i in model.generate(sample_ctx, max_new_tokens=400)[0].tolist()))
print(f"\nwrote {out_dir / 'weights.bin'} ({offset * 2:,} bytes) in {time.time() - started:.0f}s")
