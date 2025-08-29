'use client';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export default function Slider({ value, min, max, onChange }: SliderProps) {
  return (
    <div className="slider-wrapper">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider"
      />
    </div>
  );
}