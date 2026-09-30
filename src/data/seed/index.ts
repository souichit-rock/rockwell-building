import type { Db } from "@/data/types";
import { buildSeed, verifySeed } from "./generate";

export const SEED: Db = buildSeed();
if (import.meta.env.DEV) verifySeed(SEED);
