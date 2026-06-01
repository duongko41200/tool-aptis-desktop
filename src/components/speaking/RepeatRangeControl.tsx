import { useState } from 'react';

interface Props {
  onRangeChange: (startMs: number, endMs: number, loopEnabled: boolean) => void;
}

function parseTime(val: string): number {
  const parts = val.split(':').map(Number);
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
  return 0;
}


export default function RepeatRangeControl({ onRangeChange }: Props) {
  const [startVal, setStartVal] = useState('00:00');
  const [endVal, setEndVal] = useState('00:30');
  const [loopMode, setLoopMode] = useState(false);

  const handleChange = (start: string, end: string, loop: boolean) => {
    onRangeChange(parseTime(start), parseTime(end), loop);
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 border rounded-lg">
      <span className="text-sm font-medium text-gray-600">Repeat Range:</span>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Start</label>
        <input
          type="text"
          value={startVal}
          onChange={(e) => { setStartVal(e.target.value); handleChange(e.target.value, endVal, loopMode); }}
          placeholder="MM:SS"
          className="w-20 border rounded px-2 py-1 text-sm text-center font-mono"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">End</label>
        <input
          type="text"
          value={endVal}
          onChange={(e) => { setEndVal(e.target.value); handleChange(startVal, e.target.value, loopMode); }}
          placeholder="MM:SS"
          className="w-20 border rounded px-2 py-1 text-sm text-center font-mono"
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={loopMode}
          onChange={(e) => { setLoopMode(e.target.checked); handleChange(startVal, endVal, e.target.checked); }}
          className="w-4 h-4"
        />
        <span className="text-sm">Loop</span>
      </label>
    </div>
  );
}
