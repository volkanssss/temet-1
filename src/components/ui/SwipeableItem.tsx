import React, { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
}

const TRIGGER_THRESHOLD = 72; // px — bu kadar kaydırılınca "açık" kalır
const MAX_SWIPE = 100;        // px — maksimum kaydırma mesafesi

/**
 * Mobilde sola kaydırınca kırmızı silme alanı açılan wrapper.
 * Masaüstünde normal şekilde davranır.
 */
export default function SwipeableItem({ children, onDelete, deleteLabel = 'Sil' }: SwipeableItemProps) {
  const [offsetX, setOffsetX]   = useState(0);
  const [isOpen,  setIsOpen]    = useState(false);
  const startX   = useRef(0);
  const startY   = useRef(0);
  const dragging = useRef(false);
  const isHoriz  = useRef<boolean | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current   = e.touches[0].clientX;
    startY.current   = e.touches[0].clientY;
    dragging.current = true;
    isHoriz.current  = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // İlk harekette yön belirle
    if (isHoriz.current === null) {
      isHoriz.current = Math.abs(dx) > Math.abs(dy);
    }
    if (!isHoriz.current) return;

    // Yalnızca sola kaydırmaya izin ver
    const base = isOpen ? -MAX_SWIPE : 0;
    const next = Math.max(-MAX_SWIPE, Math.min(0, base + dx));
    setOffsetX(next);
  };

  const handleTouchEnd = () => {
    dragging.current = false;
    if (offsetX < -TRIGGER_THRESHOLD) {
      setOffsetX(-MAX_SWIPE);
      setIsOpen(true);
    } else {
      setOffsetX(0);
      setIsOpen(false);
    }
  };

  const close = () => {
    setOffsetX(0);
    setIsOpen(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    close();
    onDelete();
  };

  return (
    <div className="relative overflow-hidden rounded-3xl select-none">
      {/* ── Arka Plan: Silme Alanı ── */}
      <div
        className="absolute right-0 top-0 bottom-0 w-[100px] bg-red-500 flex flex-col items-center justify-center gap-1 rounded-r-3xl"
        aria-hidden
      >
        <Trash2 size={18} className="text-white" />
        <span className="text-white text-[10px] font-bold uppercase tracking-wider">{deleteLabel}</span>
      </div>

      {/* ── Ön Plan: İçerik ── */}
      <div
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: dragging.current ? 'none' : 'transform 0.28s cubic-bezier(0.16,1,0.3,1)',
          position: 'relative',
          zIndex: 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (isOpen) { close(); } }}
      >
        {children}
      </div>

      {/* ── Backdrop (açıkken dışarı tıklamayı yakala) ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={handleDelete}
          aria-label="Sil"
        />
      )}
    </div>
  );
}
