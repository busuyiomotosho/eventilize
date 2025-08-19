import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import QrCodeDisplay from '../QrCodeDisplay';

describe('QrCodeDisplay', () => {
  it('renders QR code with default props', () => {
    render(<QrCodeDisplay value="test-value" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('renders QR code with custom props', () => {
    render(
      <QrCodeDisplay
        value="custom-value"
        size={256}
        level="L"
        bgColor="#FF0000"
        fgColor="#00FF00"
      />
    );
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});
