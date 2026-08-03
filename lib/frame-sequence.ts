import {
  WALKTHROUGH,
  frameCount,
  frameUrl,
  type FrameTier,
} from "./walkthrough";

/*
 * Frames are kept as HTMLImageElement, deliberately NOT ImageBitmap.
 * An ImageBitmap pins its decoded surface for as long as it is alive:
 * one 820px frame is ~1.5 MB decoded, so a full mobile sequence would
 * hold ~290 MB and get the tab killed on a low-end Android. The browser
 * owns an <img>'s decoded copy and can evict it under memory pressure,
 * re-decoding transparently on the next draw. drawImage() is equally
 * fast from either.
 */
type Painted = HTMLImageElement;

/**
 * Loads and paints the walkthrough frame sequence onto a canvas.
 *
 * Deliberately plain TypeScript, not React: the scrub updates on every
 * scroll tick, and routing that through state would re-render the tree
 * dozens of times a second. The component owns one instance in a ref and
 * calls `draw(progress)`; nothing here ever touches React.
 *
 * Loading never blocks the scroll. The eager head of the sequence is
 * fetched first, then the remainder streams in order; asking for a frame
 * that has not arrived paints the nearest loaded one instead, so the
 * viewer sees a slightly stale frame rather than a gap or a spinner.
 */
export class FrameSequence {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly tier: FrameTier;
  private readonly total: number;
  private readonly frames: (Painted | undefined)[];

  private lastDrawn = -1;
  private disposed = false;
  /** Highest contiguous index loaded — used only to report completeness. */
  private contiguous = -1;
  private loadedCount = 0;
  /** In-flight requests, so dispose() can abort them. */
  private readonly pending = new Set<HTMLImageElement>();
  /** Progress requested before any frame existed, replayed on first paint. */
  private pendingProgress: number | null = null;

  constructor(canvas: HTMLCanvasElement, tier: FrameTier) {
    this.canvas = canvas;
    this.tier = tier;
    this.total = frameCount(tier);
    this.frames = new Array(this.total);

    const ctx = canvas.getContext("2d", {
      alpha: false,
      // We only ever write pixels; readback hints would force the slow path.
      willReadFrequently: false,
    });
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
  }

  get frameTotal(): number {
    return this.total;
  }

  /** Resize the backing store to the viewport at a capped DPR. */
  resize(): void {
    if (this.disposed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, WALKTHROUGH.maxDpr);
    const { clientWidth: w, clientHeight: h } = this.canvas;
    const bw = Math.max(1, Math.round(w * dpr));
    const bh = Math.max(1, Math.round(h * dpr));
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw;
      this.canvas.height = bh;
      // Force a repaint at the new size.
      const last = this.lastDrawn;
      this.lastDrawn = -1;
      if (last >= 0) this.paint(last);
    }
  }

  private async fetchFrame(i: number): Promise<void> {
    if (this.disposed || this.frames[i]) return;
    const url = frameUrl(this.tier, i);
    const img = new Image();
    this.pending.add(img);
    try {
      img.decoding = "async";
      img.src = url;
      // decode() resolves once the pixels are ready to draw, so the first
      // paint of a frame never blocks the scroll on a synchronous decode.
      if (typeof img.decode === "function") {
        await img.decode();
      } else {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`failed ${url}`));
        });
      }
      if (this.disposed) return;
      this.frames[i] = img;
      this.loadedCount++;
    } catch {
      /* A missing frame must never break the scrub — the nearest loaded
       * frame is painted instead. */
      return;
    } finally {
      this.pending.delete(img);
    }
    while (this.frames[this.contiguous + 1]) this.contiguous++;
  }

  /**
   * Fetch the eager head. Frame 0 is awaited first and painted the moment
   * it lands, so the canvas shows something after ~one frame's worth of
   * bytes instead of waiting on the whole head (~1 MB). Rejects if the
   * entire head failed, which is what arms the poster fallback.
   */
  async loadHead(): Promise<number> {
    const head = Math.min(WALKTHROUGH.eagerFrames, this.total);
    if (head === 0) throw new Error("no frames configured");

    await this.fetchFrame(0);
    if (this.disposed) return 0;
    // Paint immediately: either the requested scroll position, or frame 0.
    if (this.frames[0]) this.draw(this.pendingProgress ?? 0);

    await Promise.all(
      Array.from({ length: head - 1 }, (_, k) => this.fetchFrame(k + 1)),
    );
    if (this.loadedCount === 0) throw new Error("no frames loaded");
    return this.loadedCount;
  }

  /** Stream the remainder in order, a few at a time. Fire-and-forget. */
  async loadRest(): Promise<void> {
    const start = Math.min(WALKTHROUGH.eagerFrames, this.total);
    let cursor = start;
    const worker = async () => {
      while (!this.disposed && cursor < this.total) {
        const i = cursor++;
        await this.fetchFrame(i);
      }
    };
    await Promise.all(
      Array.from({ length: WALKTHROUGH.loadConcurrency }, worker),
    );
  }

  /** True once every frame has arrived. */
  get isComplete(): boolean {
    return this.contiguous >= this.total - 1;
  }

  /** How many frames are actually available to paint. */
  get loaded(): number {
    return this.loadedCount;
  }

  /**
   * Nearest loaded frame at or before `i`, else the first one after.
   * Scans back from `i` itself, NOT from the contiguous cursor: a single
   * failed fetch would otherwise pin the fallback to a stale early frame
   * for the whole streaming window.
   */
  private nearest(i: number): number {
    if (this.frames[i]) return i;
    for (let k = i - 1; k >= 0; k--) {
      if (this.frames[k]) return k;
    }
    for (let k = i + 1; k < this.total; k++) {
      if (this.frames[k]) return k;
    }
    return -1;
  }

  /** Paint by scroll progress (0–1). Returns true if pixels were drawn. */
  draw(progress: number): boolean {
    const clamped = Math.max(0, Math.min(1, progress));
    // Remember the ask, so the first frame to arrive lands on the right
    // position rather than snapping to frame 0 on a mid-page reload.
    this.pendingProgress = clamped;
    const target = Math.min(
      this.total - 1,
      Math.round(clamped * (this.total - 1)),
    );
    return this.paint(target);
  }

  /** True once at least one frame has actually been rendered. */
  get hasPainted(): boolean {
    return this.lastDrawn >= 0;
  }

  private paint(target: number): boolean {
    if (this.disposed) return false;
    const index = this.nearest(target);
    if (index < 0) return false;
    if (index === this.lastDrawn) return true; // already showing it
    const frame = this.frames[index];
    if (!frame) return false;

    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const fw = frame.width;
    const fh = frame.height;

    // Cover-fit: fill the canvas, crop the overflow around the focal point.
    const scale = Math.max(cw / fw, ch / fh);
    const dw = fw * scale;
    const dh = fh * scale;
    const dx = (cw - dw) * WALKTHROUGH.focal.x;
    const dy = (ch - dh) * WALKTHROUGH.focal.y;

    this.ctx.drawImage(frame, dx, dy, dw, dh);
    this.lastDrawn = index;
    return true;
  }

  dispose(): void {
    this.disposed = true;
    // Abort anything still in flight — setting src aborts the fetch in
    // every current engine — then drop the references. The browser
    // reclaims each <img>'s decoded surface on its own schedule.
    for (const img of this.pending) img.src = "";
    this.pending.clear();
    this.frames.length = 0;
  }
}
