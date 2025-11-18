/**
 * TraceInspector Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TraceInspector } from './TraceInspector';
import { ModuleState } from '../store/chat.store';

describe('TraceInspector', () => {
  const mockOnClose = vi.fn();

  describe('Rendering', () => {
    it('should render modal with header', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.IDLE}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('🔍 Data Flow Inspector')).toBeInTheDocument();
      expect(screen.getByText('See exactly how your data flows through the system')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.IDLE}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByText('✕');
      expect(closeButton).toBeInTheDocument();
    });

    it('should render privacy information', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.IDLE}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('🛡️ Privacy Guarantee')).toBeInTheDocument();
      expect(screen.getByText('🔒 Local Processing')).toBeInTheDocument();
    });

    it('should render privacy details', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.IDLE}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/Email addresses/)).toBeInTheDocument();
      expect(screen.getByText(/Phone numbers/)).toBeInTheDocument();
      expect(screen.getByText(/Social Security Numbers/)).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when clicking close button', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <TraceInspector
          moduleState={ModuleState.IDLE}
          providerName={null}
          onClose={onClose}
        />
      );

      const closeButton = screen.getByText('✕');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking overlay', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const { container } = render(
        <TraceInspector
          moduleState={ModuleState.IDLE}
          providerName={null}
          onClose={onClose}
        />
      );

      const overlay = container.querySelector('.trace-inspector-overlay');
      await user.click(overlay!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not close when clicking modal content', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const { container } = render(
        <TraceInspector
          moduleState={ModuleState.IDLE}
          providerName={null}
          onClose={onClose}
        />
      );

      const modal = container.querySelector('.trace-inspector-modal');
      await user.click(modal!);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Trace Steps - User Input', () => {
    it('should always show user input step', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.IDLE}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('User Input Received')).toBeInTheDocument();
      expect(screen.getByText('Your message has been received')).toBeInTheDocument();
    });

    it('should mark user input as completed', () => {
      const { container } = render(
        <TraceInspector
          moduleState={ModuleState.IDLE}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      const userInputStep = screen.getByText('User Input Received').closest('.trace-step');
      expect(userInputStep).toHaveClass('trace-step-completed');
    });
  });

  describe('Trace Steps - Routing', () => {
    it('should show routing step when in LOCAL_ROUTING state', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.LOCAL_ROUTING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Routing Decision')).toBeInTheDocument();
      expect(screen.getByText('Determining which AI module to use')).toBeInTheDocument();
    });

    it('should mark routing as active when in LOCAL_ROUTING state', () => {
      const { container } = render(
        <TraceInspector
          moduleState={ModuleState.LOCAL_ROUTING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      const routingStep = screen.getByText('Routing Decision').closest('.trace-step');
      expect(routingStep).toHaveClass('trace-step-active');
    });

    it('should mark routing as completed when past LOCAL_ROUTING', () => {
      const { container } = render(
        <TraceInspector
          moduleState={ModuleState.SCRUBBING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      const routingStep = screen.getByText('Routing Decision').closest('.trace-step');
      expect(routingStep).toHaveClass('trace-step-completed');
    });

    it('should not show routing step for LOCAL_PROCESSING', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.LOCAL_PROCESSING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText('Routing Decision')).not.toBeInTheDocument();
    });
  });

  describe('Trace Steps - Scrubbing', () => {
    it('should show scrubbing step when in SCRUBBING state', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.SCRUBBING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Privacy Protection (Scrubbing)')).toBeInTheDocument();
      expect(screen.getByText(/Removing personally identifiable information/)).toBeInTheDocument();
    });

    it('should mark scrubbing as active when in SCRUBBING state', () => {
      const { container } = render(
        <TraceInspector
          moduleState={ModuleState.SCRUBBING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      const scrubbingStep = screen.getByText('Privacy Protection (Scrubbing)').closest('.trace-step');
      expect(scrubbingStep).toHaveClass('trace-step-active');
    });

    it('should mark scrubbing as completed when past SCRUBBING', () => {
      const { container } = render(
        <TraceInspector
          moduleState={ModuleState.EXTERNAL_API}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      const scrubbingStep = screen.getByText('Privacy Protection (Scrubbing)').closest('.trace-step');
      expect(scrubbingStep).toHaveClass('trace-step-completed');
    });
  });

  describe('Trace Steps - External API', () => {
    it('should show external API step with provider name', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.EXTERNAL_API}
          providerName="OpenAI GPT-4"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('External API Call (OpenAI GPT-4)')).toBeInTheDocument();
      expect(screen.getByText('Sending scrubbed request to external AI service')).toBeInTheDocument();
    });

    it('should show generic provider name when not provided', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.EXTERNAL_API}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('External API Call (Provider)')).toBeInTheDocument();
    });

    it('should mark external API as active when in EXTERNAL_API state', () => {
      const { container } = render(
        <TraceInspector
          moduleState={ModuleState.EXTERNAL_API}
          providerName="OpenAI GPT-4"
          onClose={mockOnClose}
        />
      );

      const apiStep = screen.getByText('External API Call (OpenAI GPT-4)').closest('.trace-step');
      expect(apiStep).toHaveClass('trace-step-active');
    });

    it('should mark external API as completed when in UNSCRUBBING', () => {
      const { container } = render(
        <TraceInspector
          moduleState={ModuleState.UNSCRUBBING}
          providerName="OpenAI GPT-4"
          onClose={mockOnClose}
        />
      );

      const apiStep = screen.getByText('External API Call (OpenAI GPT-4)').closest('.trace-step');
      expect(apiStep).toHaveClass('trace-step-completed');
    });
  });

  describe('Trace Steps - Local Processing', () => {
    it('should show local processing step when in LOCAL_PROCESSING state', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.LOCAL_PROCESSING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Local AI Processing')).toBeInTheDocument();
      expect(screen.getByText(/Processing your request entirely on your device/)).toBeInTheDocument();
    });

    it('should mark local processing as active', () => {
      const { container } = render(
        <TraceInspector
          moduleState={ModuleState.LOCAL_PROCESSING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      const localStep = screen.getByText('Local AI Processing').closest('.trace-step');
      expect(localStep).toHaveClass('trace-step-active');
    });
  });

  describe('Trace Steps - Unscrubbing', () => {
    it('should show unscrubbing step when in UNSCRUBBING state', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.UNSCRUBBING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Data Restoration (Unscrubbing)')).toBeInTheDocument();
      expect(screen.getByText('Restoring your original data in the response')).toBeInTheDocument();
    });

    it('should mark unscrubbing as active when in UNSCRUBBING state', () => {
      const { container } = render(
        <TraceInspector
          moduleState={ModuleState.UNSCRUBBING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      const unscrubbingStep = screen.getByText('Data Restoration (Unscrubbing)').closest('.trace-step');
      expect(unscrubbingStep).toHaveClass('trace-step-active');
    });
  });

  describe('Trace Steps - Response Delivery', () => {
    it('should show response delivery as pending when not IDLE', () => {
      const { container } = render(
        <TraceInspector
          moduleState={ModuleState.LOCAL_ROUTING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Response Delivery')).toBeInTheDocument();
      expect(screen.getByText('Delivering the final response to you')).toBeInTheDocument();

      const responseStep = screen.getByText('Response Delivery').closest('.trace-step');
      expect(responseStep).toHaveClass('trace-step-pending');
    });

    it('should not show response delivery when IDLE', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.IDLE}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText('Response Delivery')).not.toBeInTheDocument();
    });
  });

  describe('Status Badges', () => {
    it('should show completed badge for completed steps', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.LOCAL_ROUTING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      const badges = screen.getAllByText('completed');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should show active badge for active steps', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.LOCAL_ROUTING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('should show pending badge for pending steps', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.LOCAL_ROUTING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('pending')).toBeInTheDocument();
    });
  });

  describe('Timestamps', () => {
    it('should display timestamps for completed steps', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.LOCAL_ROUTING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      // Should have timestamps in "Xs ago" format
      const timestamps = screen.queryAllByText(/\d+s ago/);
      expect(timestamps.length).toBeGreaterThan(0);
    });

    it('should not display timestamp for pending steps', () => {
      const { container } = render(
        <TraceInspector
          moduleState={ModuleState.LOCAL_ROUTING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      const responseStep = screen.getByText('Response Delivery').closest('.trace-step');
      const timestamp = responseStep?.querySelector('.trace-step-time');
      expect(timestamp).not.toBeInTheDocument();
    });
  });

  describe('Module State Flows', () => {
    it('should show correct steps for external API flow', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.EXTERNAL_API}
          providerName="OpenAI GPT-4"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('User Input Received')).toBeInTheDocument();
      expect(screen.getByText('Routing Decision')).toBeInTheDocument();
      expect(screen.getByText('Privacy Protection (Scrubbing)')).toBeInTheDocument();
      expect(screen.getByText('External API Call (OpenAI GPT-4)')).toBeInTheDocument();
      expect(screen.getByText('Response Delivery')).toBeInTheDocument();
    });

    it('should show correct steps for local processing flow', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.LOCAL_PROCESSING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('User Input Received')).toBeInTheDocument();
      expect(screen.getByText('Local AI Processing')).toBeInTheDocument();
      expect(screen.getByText('Response Delivery')).toBeInTheDocument();

      // Should not show scrubbing for local processing
      expect(screen.queryByText('Privacy Protection (Scrubbing)')).not.toBeInTheDocument();
    });

    it('should show complete flow for unscrubbing state', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.UNSCRUBBING}
          providerName="Anthropic Claude"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('User Input Received')).toBeInTheDocument();
      expect(screen.getByText('Routing Decision')).toBeInTheDocument();
      expect(screen.getByText('Privacy Protection (Scrubbing)')).toBeInTheDocument();
      expect(screen.getByText('External API Call (Anthropic Claude)')).toBeInTheDocument();
      expect(screen.getByText('Data Restoration (Unscrubbing)')).toBeInTheDocument();
      expect(screen.getByText('Response Delivery')).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should show completed icon for completed steps', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.LOCAL_ROUTING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      // User input should show ✅
      const userInputStep = screen.getByText('User Input Received').closest('.trace-step');
      expect(userInputStep?.textContent).toContain('✅');
    });

    it('should show active icons for active steps', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.LOCAL_ROUTING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      // Routing should show 🧭
      const routingStep = screen.getByText('Routing Decision').closest('.trace-step');
      expect(routingStep?.textContent).toContain('🧭');
    });

    it('should show different icons for different steps', () => {
      render(
        <TraceInspector
          moduleState={ModuleState.UNSCRUBBING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      // Should have various icons
      const { container } = render(
        <TraceInspector
          moduleState={ModuleState.UNSCRUBBING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      const timeline = container.querySelector('.trace-timeline');
      expect(timeline?.textContent).toContain('✅'); // Completed
      expect(timeline?.textContent).toContain('🔓'); // Unscrubbing
      expect(timeline?.textContent).toContain('📨'); // Response
    });
  });

  describe('Structure', () => {
    it('should have correct modal structure', () => {
      const { container } = render(
        <TraceInspector
          moduleState={ModuleState.LOCAL_ROUTING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      expect(container.querySelector('.trace-inspector-overlay')).toBeInTheDocument();
      expect(container.querySelector('.trace-inspector-modal')).toBeInTheDocument();
      expect(container.querySelector('.trace-inspector-header')).toBeInTheDocument();
      expect(container.querySelector('.trace-inspector-content')).toBeInTheDocument();
      expect(container.querySelector('.trace-timeline')).toBeInTheDocument();
      expect(container.querySelector('.trace-info-panel')).toBeInTheDocument();
    });

    it('should render connector lines between steps', () => {
      const { container } = render(
        <TraceInspector
          moduleState={ModuleState.EXTERNAL_API}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      const connectors = container.querySelectorAll('.trace-line');
      expect(connectors.length).toBeGreaterThan(0);
    });
  });

  describe('Dynamic Updates', () => {
    it('should update steps when moduleState changes', () => {
      const { rerender } = render(
        <TraceInspector
          moduleState={ModuleState.LOCAL_ROUTING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Routing Decision').closest('.trace-step')).toHaveClass('trace-step-active');

      rerender(
        <TraceInspector
          moduleState={ModuleState.SCRUBBING}
          providerName={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Routing Decision').closest('.trace-step')).toHaveClass('trace-step-completed');
      expect(screen.getByText('Privacy Protection (Scrubbing)').closest('.trace-step')).toHaveClass('trace-step-active');
    });

    it('should update provider name when changed', () => {
      const { rerender } = render(
        <TraceInspector
          moduleState={ModuleState.EXTERNAL_API}
          providerName="OpenAI GPT-4"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('External API Call (OpenAI GPT-4)')).toBeInTheDocument();

      rerender(
        <TraceInspector
          moduleState={ModuleState.EXTERNAL_API}
          providerName="Anthropic Claude"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('External API Call (Anthropic Claude)')).toBeInTheDocument();
    });
  });
});
