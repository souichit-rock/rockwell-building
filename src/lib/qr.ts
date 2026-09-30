// A decorative stand-in for a QR code: 25 x 25 (version 2 size), fixed finder squares, timing lines and one alignment
// square, with the data area filled from an FNV-1a hash of the text. It is NOT scannable; the UI captions it as a placeholder.

const N = 25;

function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** `true` = dark module. Deterministic for a given `text`. */
export function qrPlaceholderCells(text: string): boolean[][] {
  let s = fnv1a(text) || 1; // xorshift32 must not start at 0
  const bit = (): boolean => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return ((s >>> 16) & 1) === 1;
  };

  // data area first (row-major), so the pattern depends only on the text; fixed structures are painted over it
  const cells: boolean[][] = Array.from({ length: N }, () => Array.from({ length: N }, bit));

  // timing lines
  for (let i = 8; i < N - 8; i++) {
    cells[6][i] = i % 2 === 0;
    cells[i][6] = i % 2 === 0;
  }

  // alignment square, 5 x 5 centred on (18, 18): dark ring, light ring, dark centre
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) cells[18 + dr][18 + dc] = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
  }

  // finder squares (7 x 7) with a one-module light separator, top-left / top-right / bottom-left
  for (const [r0, c0] of [[0, 0], [0, N - 8], [N - 8, 0]]) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const lr = r0 === 0 ? r : r - 1; // local coordinates inside the 7 x 7 square
        const lc = c0 === 0 ? c : c - 1;
        const inSquare = lr >= 0 && lr < 7 && lc >= 0 && lc < 7;
        const ring = lr === 0 || lr === 6 || lc === 0 || lc === 6;
        const core = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
        cells[r0 + r][c0 + c] = inSquare && (ring || core);
      }
    }
  }
  return cells;
}
