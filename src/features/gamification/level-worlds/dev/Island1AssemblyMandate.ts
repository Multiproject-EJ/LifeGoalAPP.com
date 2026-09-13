import './Island1AssemblyMandate.css';
import { lockPageScroll } from '../../../../utils/scrollLock';

export interface AssemblyMandateOptions {
  signed?: boolean;
  /** Only the host's canonical action may persist the appointment. */
  onSign: () => Promise<void>;
  onClose?: () => void;
}

/** Shared, presentation-only mini-mission used by the live board and review. */
export function showAssemblyMandate(options: AssemblyMandateOptions) {
  const penArt = '<img src="/assets/islands/island-001/missions/mandate-pen-v1.png" alt="" draggable="false" />';
  const dialog = document.createElement('dialog');
  dialog.className = 'assembly-mandate';
  dialog.setAttribute('aria-label', 'Sign the peacekeeping mandate');
  dialog.innerHTML = `
    <div class="mandate-stage">
      <div class="mandate-eyebrow">ISLAND 001 · THE ASSEMBLY</div>
      <div class="mandate-intro">The Assembly has chosen you.</div>
      <div class="mandate-scroll">
        <div class="mandate-roller"></div>
        <article class="mandate-paper">
          <div class="mandate-ornament" aria-hidden="true">✦</div>
          <h1>Your mission</h1>
          <div class="mandate-rule"></div>
          <h2>Diplomatic Peacekeeping Envoy</h2>
          <p>Bring nations together. Coordinate specialist engineering support for every island.</p>
          <button class="mandate-signature" type="button" aria-label="Signature area: place the pen here">
            <span class="mandate-sign-hint"><span aria-hidden="true">↓</span> DROP PEN HERE</span>
            <svg viewBox="0 0 300 64" aria-hidden="true"><path pathLength="1" d="M35 44 Q53 19 61 29 Q66 37 51 47 Q72 30 77 39 Q85 49 98 32 Q109 24 112 40 Q121 49 137 34 Q150 25 155 40 L174 35"/></svg>
            <span class="mandate-sign-label">to accept your mission</span>
            <span class="mandate-writing-pen" aria-hidden="true">${penArt}</span>
          </button>
        </article>
        <div class="mandate-roller mandate-roller-bottom"></div>
        <div class="mandate-seal" aria-hidden="true">✦<small>ASSEMBLY</small></div>
      </div>
      <div class="mandate-tools">
        <button class="mandate-pen" type="button" aria-label="Pick up the signing pen"><span aria-hidden="true">${penArt}</span><small>DRAG ME ↑</small></button>
        <div><strong class="mandate-prompt">Make it official.</strong><p class="mandate-status" role="status" aria-live="polite">Drag the glowing pen into the highlighted box.</p></div>
      </div>
      <div class="mandate-actions"><button class="mandate-later" type="button">Not yet</button><button class="mandate-accept" type="button">Sign the mandate</button></div>
    </div>`;
  const select = <T extends HTMLElement>(selector: string) => dialog.querySelector<T>(selector)!;
  const pen = select<HTMLButtonElement>('.mandate-pen');
  const area = select<HTMLButtonElement>('.mandate-signature');
  const accept = select<HTMLButtonElement>('.mandate-accept');
  const later = select<HTMLButtonElement>('.mandate-later');
  const status = select('.mandate-status');
  const prompt = select('.mandate-prompt');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  const paper = select('.mandate-paper');
  const resizeObserver = new ResizeObserver(() => {
    dialog.style.setProperty('--roll-travel', `${paper.offsetHeight / 2}px`);
  });
  const previousFocus = document.activeElement as HTMLElement | null;
  const unlockScroll = lockPageScroll();
  let disposed = false, pending = false, signed = Boolean(options.signed), armed = false;
  let pointer: { id: number; x: number; y: number; moved: boolean } | null = null;
  let animationTimer: ReturnType<typeof setTimeout> | undefined;
  let resolveAnimation: (() => void) | undefined;
  function resetPen() {
    pen.style.transform = ''; pen.classList.remove('is-dragging');
    area.classList.remove('is-target'); pointer = null;
  }
  function finishView() {
    dialog.classList.remove('is-signing'); dialog.classList.add('is-signed');
    prompt.textContent = 'Mandate accepted. Welcome, Envoy.';
    status.textContent = 'Signed, sealed. Your mission awaits.';
    accept.textContent = 'Begin the mission'; accept.disabled = false;
    later.hidden = true; pen.disabled = true; area.disabled = true;
  }
  function close() {
    if (disposed) return;
    disposed = true; abort.abort(); resizeObserver.disconnect(); clearTimeout(animationTimer); resolveAnimation?.();
    dialog.close(); dialog.remove(); unlockScroll();
    previousFocus?.focus(); options.onClose?.();
  }
  async function sign() {
    if (pending || disposed) return;
    if (signed) { close(); return; }
    pending = true; armed = false; resetPen();
    accept.disabled = true; pen.disabled = true; area.disabled = true; later.textContent = 'Close';
    dialog.classList.add('is-signing');
    status.textContent = 'Signing your appointment…';
    try {
      await Promise.all([
        options.onSign(),
        new Promise<void>(resolve => { resolveAnimation = resolve; animationTimer = setTimeout(resolve, reduced.matches ? 0 : 3500); }),
      ]);
      if (disposed) return;
      signed = true; pending = false; finishView();
    } catch {
      if (disposed) return;
      pending = false; clearTimeout(animationTimer); dialog.classList.remove('is-signing');
      accept.disabled = pen.disabled = area.disabled = later.disabled = false;
      later.textContent = 'Not yet';
      status.textContent = 'The appointment could not be saved. Please try again.';
    }
  }
  const inArea = (x: number, y: number) => {
    const r = area.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };
  pen.addEventListener('pointerdown', e => {
    if (pending || signed || e.button !== 0) return;
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    pen.setPointerCapture(e.pointerId); pen.classList.add('is-dragging');
  }, { signal: abort.signal });
  pen.addEventListener('pointermove', e => {
    if (!pointer || pointer.id !== e.pointerId) return;
    const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
    pointer.moved ||= Math.hypot(dx, dy) > 6;
    pen.style.transform = `translate(${dx}px,${dy}px) rotate(-18deg)`;
    area.classList.toggle('is-target', inArea(e.clientX, e.clientY));
  }, { signal: abort.signal });
  pen.addEventListener('pointerup', e => {
    if (!pointer || pointer.id !== e.pointerId) return;
    const moved = pointer.moved, drop = inArea(e.clientX, e.clientY);
    if (pen.hasPointerCapture(e.pointerId)) pen.releasePointerCapture(e.pointerId);
    resetPen();
    if (drop && moved) void sign();
    else { armed = !moved; status.textContent = moved ? 'Drop the pen inside the highlighted box.' : 'Pen selected. Now select the highlighted box.'; }
  }, { signal: abort.signal });
  pen.addEventListener('pointercancel', resetPen, { signal: abort.signal });
  pen.addEventListener('lostpointercapture', resetPen, { signal: abort.signal });
  pen.addEventListener('click', e => { if (e.detail === 0) { armed = true; status.textContent = 'Pen selected. Now select the highlighted box.'; area.focus(); } }, { signal: abort.signal });
  area.addEventListener('click', () => { if (armed) void sign(); else { status.textContent = 'Pick up the pen first, or use Sign the mandate.'; pen.focus(); } }, { signal: abort.signal });
  accept.addEventListener('click', () => void sign(), { signal: abort.signal });
  later.addEventListener('click', close, { signal: abort.signal });
  dialog.addEventListener('cancel', e => { e.preventDefault(); close(); }, { signal: abort.signal });
  document.body.append(dialog); dialog.showModal();
  dialog.style.setProperty('--roll-travel', `${paper.offsetHeight / 2}px`);
  resizeObserver.observe(paper);
  if (signed) finishView();
  (signed ? accept : pen).focus();
  return { close };
}
