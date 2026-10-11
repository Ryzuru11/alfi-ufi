"use client";
import { useEffect, useState } from "react";

interface P { id: number; left: number; dur: number; delay: number; size: number; char: string }
const CHARS = ["✿", "❀", "✦", "◈", "❋", "✾", "◆"];

export default function FloatingPetals() {
  const [petals, setPetals] = useState<P[]>([]);
  useEffect(() => {
    setPetals(Array.from({ length: 10 }, (_, i) => ({
      id: i,
      left: 5 + Math.random() * 90,
      dur: 9 + Math.random() * 8,
      delay: Math.random() * 10,
      size: 10 + Math.random() * 8,
      char: CHARS[i % CHARS.length],
    })));
  }, []);

  return (
    <>
      {petals.map(p => (
        <span key={p.id} className="petal" style={{
          left: `${p.left}%`,
          animationDuration: `${p.dur}s`,
          animationDelay: `${p.delay}s`,
          fontSize: `${p.size}px`,
          color: p.id % 2 === 0 ? "#D4AF6A" : "#C8756B",
          opacity: 0.5,
        }}>
          {p.char}
        </span>
      ))}
    </>
  );
}
