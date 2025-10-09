import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import TemplateItem from './index';
import { Template } from 'types/template';
import { theme } from 'theme';
import { ThemeProvider } from '@mui/material';
import { useUserStore } from 'contexts/useUserStore';

// Mock the useUserStore
vi.mock('contexts/useUserStore', () => ({
  useUserStore: vi.fn()
}));

const mockUseUserStore = vi.mocked(useUserStore);

// Mocking the navigate function from react-router
vi.mock('react-router', () => ({
  ...vi.importActual('react-router'),
  useNavigate: () => vi.fn()
}));

describe('TemplateItem Component', () => {
  const mockHandleSelectTemplate = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    // Default mock for useUserStore - can be overridden in individual tests
    mockUseUserStore.mockReturnValue({
      userInfo: {
        email: 'default@test.com',
        is_internal: false,
        plan: {
          type: 'free',
          status: 'active',
          remaining_documents: 1
        }
      },
      setUserInfo: vi.fn(),
      updateUserInfo: vi.fn(),
      clearUserInfo: vi.fn()
    });
  });

  const template: Template = {
    id: '1',
    type: 'Report',
    name: 'Monthly Report',
    description: 'This is a monthly report template.',
    generation_flow: 'single_page',
    display_name_on_plan_overview: 'Monthly Report',
    user_inputs: [
      {
        default_value: 'input1',
        display_name: 'Input 1',
        display_size: 'small',
        slug: 'input1',
        text_limit: 100,
        type: 'text'
      },
      {
        default_value: 'input2',
        display_name: 'Input 2',
        display_size: 'small',
        slug: 'input2',
        text_limit: 100,
        type: 'text'
      }
    ]
  };

  it('renders the template data correctly', () => {
    render(
      <ThemeProvider theme={theme}>
        <TemplateItem template={template} />
      </ThemeProvider>
    );

    expect(screen.getByTestId('templateItem-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('templateItem-type')).toHaveTextContent('Report');
    expect(screen.getByTestId('templateItem-name')).toHaveTextContent(
      'Monthly Report'
    );
    expect(
      screen.getByText('This is a monthly report template.')
    ).toBeInTheDocument();

    // Checks for user input tags
    expect(
      screen.getByTestId('templateItem-userInput-input1')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('templateItem-userInput-input2')
    ).toBeInTheDocument();
  });

  it('does not allow template selection when plan is limited', () => {
    mockUseUserStore.mockReturnValue({
      userInfo: {
        is_internal: false,
        plan: {
          status: 'active',
          remaining_documents: 0
        }
      },
      setUserInfo: vi.fn(),
      updateUserInfo: vi.fn(),
      clearUserInfo: vi.fn()
    });

    render(
      <ThemeProvider theme={theme}>
        <TemplateItem template={template} />
      </ThemeProvider>
    );

    const wrapper = screen.getByTestId('templateItem-wrapper');
    fireEvent.click(wrapper);

    expect(mockHandleSelectTemplate).not.toHaveBeenCalled();
  });

  it('displays limit information and upgrade button when plan is limited', () => {
    mockUseUserStore.mockReturnValue({
      userInfo: {
        is_internal: false,
        plan: {
          status: 'active',
          type: 'free',
          end_date: '2022-12-31',
          remaining_documents: 0,
          cancel_at_period_end: false
        }
      },
      setUserInfo: vi.fn(),
      updateUserInfo: vi.fn(),
      clearUserInfo: vi.fn()
    });

    render(
      <ThemeProvider theme={theme}>
        <TemplateItem template={template} />
      </ThemeProvider>
    );

    expect(screen.getByTestId('templateItem-limitInfo')).toBeInTheDocument();
    expect(
      screen.getByTestId('templateItem-upgradeButton')
    ).toBeInTheDocument();
    expect(screen.getByText('Upgrade')).toBeInTheDocument();
  });

  it('calls setShowSubscriptionDialog on clicking upgrade/renew button when user plan is expired', () => {
    const mockSetShowSubscriptionDialog = vi.fn();

    mockUseUserStore.mockReturnValue({
      userInfo: {
        is_internal: false,
        plan: {
          status: 'past_due',
          type: 'free',
          end_date: '2022-12-31',
          remaining_documents: 1,
          cancel_at_period_end: false
        }
      },
      setUserInfo: vi.fn(),
      updateUserInfo: vi.fn(),
      clearUserInfo: vi.fn(),
      setShowSubscriptionDialog: mockSetShowSubscriptionDialog
    });

    render(
      <ThemeProvider theme={theme}>
        <TemplateItem template={template} />
      </ThemeProvider>
    );

    const upgradeButton = screen.getByTestId('templateItem-upgradeButton');
    fireEvent.click(upgradeButton);

    expect(mockSetShowSubscriptionDialog).toHaveBeenCalledWith(true);
  });
});
