interface TransplantedDice3DProps {
  value: number;
  isRolling: boolean;
}

const PIPS: Record<number, string> = {
  1: '•',
  2: '••',
  3: '•••',
  4: '••••',
  5: '•••••',
  6: '••••••',
};

export function TransplantedDice3D({ value, isRolling }: TransplantedDice3DProps) {
  return (
    <div
      className="relative w-10 h-10 rounded-lg border border-red-400/40 bg-gradient-to-br from-red-500 via-rose-600 to-red-700 text-white flex items-center justify-center"
      style={{
        transform: isRolling ? 'rotate(18deg) scale(1.08)' : 'rotate(0deg) scale(1)',
        transition: isRolling ? 'transform 120ms linear' : 'transform 240ms ease',
      }}
    >
      <span className="text-[10px] tracking-tight">{PIPS[Math.max(1, Math.min(6, value))]}</span>
    </div>
  );
}
