import { useEffect, useRef } from 'react';

export const FluidCursor = () => {
  const blob1Ref = useRef<HTMLDivElement>(null);
  const blob2Ref = useRef<HTMLDivElement>(null);
  const blob3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    let currentPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let targetPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const handleMouseMove = (e: MouseEvent) => {
      targetPos = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      // Saffron blob - fastest
      currentPos.x += (targetPos.x - currentPos.x) * 0.08;
      currentPos.y += (targetPos.y - currentPos.y) * 0.08;

      if (blob1Ref.current) {
        blob1Ref.current.style.transform = `translate(${currentPos.x}px, ${currentPos.y}px)`;
      }

      // Navy/Blue blob - medium speed
      if (blob2Ref.current) {
        const b2x = parseFloat(blob2Ref.current.dataset.x || String(currentPos.x));
        const b2y = parseFloat(blob2Ref.current.dataset.y || String(currentPos.y));
        const nextX = b2x + (targetPos.x - b2x) * 0.04;
        const nextY = b2y + (targetPos.y - b2y) * 0.04;
        blob2Ref.current.dataset.x = String(nextX);
        blob2Ref.current.dataset.y = String(nextY);
        blob2Ref.current.style.transform = `translate(${nextX}px, ${nextY}px)`;
      }

      // Green blob - slowest speed
      if (blob3Ref.current) {
        const b3x = parseFloat(blob3Ref.current.dataset.x || String(currentPos.x));
        const b3y = parseFloat(blob3Ref.current.dataset.y || String(currentPos.y));
        const nextX = b3x + (targetPos.x - b3x) * 0.02;
        const nextY = b3y + (targetPos.y - b3y) * 0.02;
        blob3Ref.current.dataset.x = String(nextX);
        blob3Ref.current.dataset.y = String(nextY);
        blob3Ref.current.style.transform = `translate(${nextX}px, ${nextY}px)`;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden w-full h-full opacity-100 mix-blend-multiply dark:mix-blend-screen dark:opacity-70 transition-opacity duration-500">
      {/* Saffron Blob */}
      <div
        ref={blob1Ref}
        className="absolute top-[-200px] left-[-200px] w-[400px] h-[400px] rounded-full bg-[hsl(30,100%,50%)] opacity-60 blur-[100px] will-change-transform dark:bg-[hsl(30,100%,40%)]"
      />
      {/* Navy Blue Blob */}
      <div
        ref={blob2Ref}
        className="absolute top-[-250px] left-[-250px] w-[500px] h-[500px] rounded-full bg-[hsl(216,100%,30%)] opacity-60 blur-[120px] will-change-transform dark:bg-[hsl(216,80%,40%)]"
      />
      {/* Green Blob */}
      <div
        ref={blob3Ref}
        className="absolute top-[-150px] left-[-150px] w-[300px] h-[300px] rounded-full bg-[hsl(145,80%,30%)] opacity-50 blur-[80px] will-change-transform dark:bg-[hsl(145,80%,35%)]"
      />
    </div>
  );
};
