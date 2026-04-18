import { useEffect, useRef, useState } from "react";

export interface SwipeAction {
  label: string;
  confirmedLabel?: string;
  onAction: () => void;
  variant?: "destructive" | "default";
  widthPx?: number;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  actions: SwipeAction[];
  onTap?: () => void;
  disabled?: boolean;
  className?: string;
}

export function SwipeableRow({
  children,
  actions,
  onTap,
  disabled,
  className,
}: SwipeableRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const isOpenRef = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<number | null>(null);
  const didSwipeRef = useRef(false);

  const totalWidth = actions.reduce((sum, a) => sum + (a.widthPx ?? 90), 0);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      if (!isOpenRef.current) return;
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        snapTo(false);
      }
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function snapTo(open: boolean) {
    if (contentRef.current) {
      contentRef.current.style.transition = "transform 0.2s ease";
      contentRef.current.style.transform = open
        ? `translateX(-${totalWidth}px)`
        : "translateX(0)";
    }
    isOpenRef.current = open;
    setIsOpen(open);
    if (!open) setPendingAction(null);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isDraggingRef.current = false;
    didSwipeRef.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled || startXRef.current === null) return;

    const deltaX = e.clientX - startXRef.current;
    const deltaY = e.clientY - (startYRef.current ?? e.clientY);

    if (!isDraggingRef.current) {
      if (Math.abs(deltaX) > 5 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isDraggingRef.current = true;
        didSwipeRef.current = true;
      } else {
        return;
      }
    }

    const base = isOpenRef.current ? -totalWidth : 0;
    const raw = base + deltaX;
    const clamped = Math.min(0, Math.max(-(totalWidth + 10), raw));

    if (contentRef.current) {
      contentRef.current.style.transition = "none";
      contentRef.current.style.transform = `translateX(${clamped}px)`;
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled || startXRef.current === null) return;

    const deltaX = e.clientX - startXRef.current;

    if (!isDraggingRef.current) {
      startXRef.current = null;
      return;
    }

    if (contentRef.current) {
      contentRef.current.style.transition = "transform 0.2s ease";
    }

    if (isOpenRef.current) {
      snapTo(deltaX < 40);
    } else {
      snapTo(deltaX < -60);
    }

    startXRef.current = null;
    isDraggingRef.current = false;
  }

  function handleClick() {
    if (disabled || didSwipeRef.current) {
      didSwipeRef.current = false;
      return;
    }
    if (isOpenRef.current) {
      snapTo(false);
    } else {
      onTap?.();
    }
  }

  function handleActionClick(index: number) {
    const action = actions[index];
    if (action.confirmedLabel) {
      if (pendingAction === index) {
        action.onAction();
        snapTo(false);
      } else {
        setPendingAction(index);
      }
    } else {
      action.onAction();
      snapTo(false);
    }
  }

  if (actions.length === 0) return <>{children}</>;

  return (
    <div
      ref={rowRef}
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{ touchAction: "pan-y" }}
    >
      {/* Action buttons — revealed as content slides left */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-stretch"
        style={{ width: totalWidth }}
      >
        {actions.map((action, index) => (
          <button
            key={index}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => handleActionClick(index)}
            style={{ width: action.widthPx ?? 90 }}
            className={`flex items-center justify-center text-sm font-semibold transition-colors ${
              action.variant === "destructive"
                ? "swipe-action-destructive"
                : "bg-wise-gray text-white"
            }`}
          >
            {pendingAction === index ? action.confirmedLabel : action.label}
          </button>
        ))}
      </div>

      {/* Sliding content layer */}
      <div
        ref={contentRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !disabled) onTap?.();
        }}
        style={{
          transform: "translateX(0)",
          transition: "transform 0.2s ease",
        }}
        className="relative z-10 bg-inherit bg-white dark:bg-near-black"
      >
        {children}
      </div>
    </div>
  );
}
