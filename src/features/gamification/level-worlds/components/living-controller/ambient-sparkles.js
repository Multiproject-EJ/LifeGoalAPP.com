/** Rendering-only shoulder accents: same blue-white light language as MAX power,
 * with a short greeting that settles to a calm glow. No state/economy effects. */
export function drawAmbientSparkles(context, time, age, color, reduced) {
  context.clearRect(0, 0, 512, 512);
  const strength = reduced ? .14 : .22 + .48 * Math.exp(-Math.max(0, age) / 1.3);
  context.save();
  for (let i = 0; i < 6; i++) {
    const t = reduced ? 0 : time;
    const x = 55 + (i * 157 % 400) + Math.sin(t * .2 + i) * 9;
    const y = 60 + (i * 113 % 380) + Math.cos(t * .17 + i) * 7;
    const alpha = strength * (reduced ? .7 : .2 + .8 * Math.pow(.5 + .5 * Math.sin(t * .8 + i * 2.7), 3));
    const haze = context.createRadialGradient(x, y, 0, x, y, 30);
    haze.addColorStop(0, color); haze.addColorStop(1, 'transparent');
    context.globalAlpha = alpha * .65;
    context.fillStyle = haze; context.fillRect(x - 30, y - 30, 60, 60);
    context.globalAlpha = alpha;
    context.strokeStyle = '#eaffff'; context.lineWidth = 1.4;
    context.beginPath(); context.moveTo(x - 7, y); context.lineTo(x + 7, y);
    context.moveTo(x, y - 7); context.lineTo(x, y + 7); context.stroke();
    context.fillStyle = '#fff'; context.beginPath(); context.arc(x, y, 1.8, 0, Math.PI * 2); context.fill();
  }
  context.restore();
}
