export async function mountBuildChecklist() {
  const root = document.querySelector('#vision-build-status');
  if (!root) return;
  try {
    const res = await fetch('/app/vision/buildplan.json', { cache: 'no-store' });
    const plan = await res.json();
    root.innerHTML = "";
    plan.phases.forEach(phase => {
      const phaseEl = document.createElement('div'); phaseEl.className = 'phase';
      const title = document.createElement('div'); title.className = 'phase-title'; title.textContent = phase.title;
      phaseEl.appendChild(title);
      phase.items.forEach(item => {
        const row = document.createElement('label'); row.className = 'item';
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.disabled = true; cb.checked = (item.status === 'done');
        const text = document.createElement('span'); text.textContent = item.label;
        row.append(cb, text); phaseEl.appendChild(row);
      });
      root.appendChild(phaseEl);
    });
  } catch (err) { console.error('BuildChecklist load failed:', err); }
}
