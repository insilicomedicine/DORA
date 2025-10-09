import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from 'theme';
import { vi } from 'vitest';
import Header from './index';
import { useUserStore } from 'contexts/useUserStore';

// Mock the useUserStore
vi.mock('contexts/useUserStore', () => ({
  useUserStore: vi.fn()
}));

const mockUseUserStore = vi.mocked(useUserStore);

vi.mock('./PharmaMenu', () => ({
  default: () => <div>PharmaMenu Mock</div>
}));
vi.mock('./UserMenu', () => ({
  default: (props: any) => (
    <div>
      UserMenu Mock
      <button onClick={props.handleMenuClose}>Close Menu</button>
    </div>
  )
}));
vi.mock('assets/icons/Science42DORA.svg?react', () => ({
  default: () => <img data-testid="dora-logo" alt="DORA" src="mock-logo.svg" />
}));

describe('Header Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (userInfo = {}) => {
    const defaultUserInfo = {
      is_internal: false,
      plan: {
        status: 'active',
        type: 'free',
        end_date: '2022-12-31',
        remaining_documents: 1,
        cancel_at_period_end: false
      }
    };

    const userInfoMock = {
      ...defaultUserInfo,
      ...userInfo
    };

    mockUseUserStore.mockReturnValue({
      userInfo: userInfoMock,
      setUserInfo: vi.fn(),
      updateUserInfo: vi.fn(),
      clearUserInfo: vi.fn()
    });

    render(
      <ThemeProvider theme={theme}>
        <Header />
      </ThemeProvider>
    );
  };

  it('should render the component correctly with mock data', () => {
    renderComponent();
    expect(screen.getByAltText('DORA')).toBeInTheDocument();
    expect(screen.getByText('PharmaMenu Mock')).toBeInTheDocument();
  });

  it('should open the blog link in a new tab when clicked', () => {
    renderComponent({
      email: 'test@test.com',
      terms_and_privacy_accepted: true
    });

    const blogLink = screen.getByText('Blog').closest('a');
    expect(blogLink).toHaveAttribute(
      'href',
      'https://insilico.com/blog/science42-dora'
    );
    expect(blogLink).toHaveAttribute('target', '_blank');
    expect(blogLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should navigate to the tutorial page when clicked', () => {
    renderComponent({
      email: 'test@test.com',
      terms_and_privacy_accepted: true
    });

    const tutorialLink = screen.getByText('Tutorial').closest('a');
    expect(tutorialLink).toHaveAttribute(
      'href',
      'https://insilico.com/science42/dora/help'
    );
    expect(tutorialLink).toHaveAttribute('target', '_blank');
    expect(tutorialLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
