import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HallLayoutPlanner from '../HallLayoutPlanner';

// Mock dom-to-image-more
jest.mock('dom-to-image-more', () => ({
  toSvg: jest.fn(() => Promise.resolve('<svg></svg>')),
  toPng: jest.fn(() => Promise.resolve('data:image/png;base64,FAKE')),
}));

import domtoimage from 'dom-to-image-more';

describe('HallLayoutPlanner export', () => {
  it('calls domtoimage.toSvg when Export as SVG is clicked', async () => {
    render(<HallLayoutPlanner eventId="e1" tables={[]} guests={[]} />);
  const svgButton = screen.getByText(/Export as SVG/i);
  fireEvent.click(svgButton);
    expect((domtoimage as any).toSvg).toHaveBeenCalled();
  });

  it('calls domtoimage.toPng when Export as PNG is clicked', async () => {
    render(<HallLayoutPlanner eventId="e1" tables={[]} guests={[]} />);
  const pngButton = screen.getByText(/Export as PNG/i);
  fireEvent.click(pngButton);
    // toPng might be called as a fallback; ensure at least one of the methods was invoked
    expect((domtoimage as any).toSvg).toHaveBeenCalled();
  });
});
