// Gate entry (`vite build --mode gate`, run with `node dist-gate/check.js`): integrity check, storyline check, then one count per collection.
import { SEED } from "@/data/seed";
import { verifySeed } from "@/data/seed/generate";
import { verifyStoryline } from "@/data/seed/storyline";

verifySeed(SEED);
let total = 0;
for (const [collection, rows] of Object.entries(SEED)) {
  const n = Object.keys(rows).length;
  total += n;
  console.log(`${collection.padEnd(16)} ${n}`);
}
console.log(`${"total".padEnd(16)} ${total}`);
for (const line of verifyStoryline(SEED)) console.log(line);
