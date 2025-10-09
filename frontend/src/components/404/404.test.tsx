import React from 'react';
import { render, screen } from '@testing-library/react';
import NotFound from './index';

describe('404 Page', () => {
  test('should render 404 page', () => {
    render(<NotFound />);
    const heading = screen.getByText(/404/i);
    const subHeading = screen.getByText(/Page Not Found/i);
    const body = screen.getByText(
      /Oops! The document you are looking for does not exist. It might have been moved or deleted./i
    );
    const button = screen.getByRole('button', { name: /Back to Home/i });

    expect(heading).toBeInTheDocument();
    expect(subHeading).toBeInTheDocument();
    expect(body).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });
});
