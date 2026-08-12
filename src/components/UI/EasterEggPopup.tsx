import React, { useEffect, useState } from 'react';

export interface EasterEggData {
  x: number;
  y: number;
  image: string;
  message: string | null;
}

interface EasterEggPopupProps {
  data: EasterEggData | null;
}

export const EasterEggPopup: React.FC<EasterEggPopupProps> = ({ data }) => {
  const [visibleData, setVisibleData] = useState<EasterEggData | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!data) return;

    setVisibleData(data);
    setIsClosing(false);

    // Total lifecycle: 0.4s entrance + 2.0s stay = 2.4s then start exit animation (0.3s)
    const timerExit = setTimeout(() => {
      setIsClosing(true);
    }, 2400);

    const timerRemove = setTimeout(() => {
      setVisibleData(null);
      setIsClosing(false);
    }, 2700);

    return () => {
      clearTimeout(timerExit);
      clearTimeout(timerRemove);
    };
  }, [data]);

  if (!visibleData) return null;

  // Position popup slightly top-left of cursor to avoid blocking mouse
  const posX = Math.max(10, visibleData.x - 140);
  const posY = Math.max(10, visibleData.y - 140);

  return (
    <>
      <style>{`
        @keyframes easterEggPopIn {
          0% {
            opacity: 0;
            transform: scale(0) rotate(-15deg);
          }
          60% {
            opacity: 1;
            transform: scale(1.15) rotate(5deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes easterEggPopOut {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.3);
          }
        }

        .easter-egg-container {
          position: fixed;
          z-index: 999999;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          animation: easterEggPopIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .easter-egg-container.closing {
          animation: easterEggPopOut 0.3s ease-in forwards;
        }

        .easter-egg-text {
          font-size: 16px;
          font-weight: 800;
          color: #ffffff;
          text-align: center;
          text-shadow: 
            0 0 4px #000000,
            -1.5px -1.5px 0 #000000,
            1.5px -1.5px 0 #000000,
            -1.5px 1.5px 0 #000000,
            1.5px 1.5px 0 #000000;
          white-space: nowrap;
          letter-spacing: 0.5px;
        }
      `}</style>

      <div
        className={`easter-egg-container ${isClosing ? 'closing' : ''}`}
        style={{
          left: `${posX}px`,
          top: `${posY}px`
        }}
      >
        <img
          src={visibleData.image}
          alt="Easter Egg"
          style={{
            width: '120px',
            height: '120px',
            objectFit: 'contain'
          }}
        />
        {visibleData.message && (
          <span className="easter-egg-text">{visibleData.message}</span>
        )}
      </div>
    </>
  );
};
