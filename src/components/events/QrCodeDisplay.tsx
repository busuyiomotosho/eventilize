'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QrCodeDisplayProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  bgColor?: string;
  fgColor?: string;
}

const QrCodeDisplay: React.FC<QrCodeDisplayProps> = ({
  value,
  size = 128,
  level = 'H',
  bgColor = '#FFFFFF',
  fgColor = '#000000',
}) => {
  return (
    <div className="flex justify-center">
      <QRCodeSVG
        value={value}
        size={size}
        level={level}
        bgColor={bgColor}
        fgColor={fgColor}
      />
    </div>
  );
};

export default QrCodeDisplay;