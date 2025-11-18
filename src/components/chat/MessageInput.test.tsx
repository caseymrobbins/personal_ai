/**
 * MessageInput Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageInput } from './MessageInput';

describe('MessageInput', () => {
  describe('Rendering', () => {
    it('should render textarea and send button', () => {
      const mockSend = vi.fn();
      render(<MessageInput onSendMessage={mockSend} />);

      expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      const mockSend = vi.fn();
      render(<MessageInput onSendMessage={mockSend} placeholder="Custom placeholder" />);

      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('should show loading spinner when disabled', () => {
      const mockSend = vi.fn();
      render(<MessageInput onSendMessage={mockSend} disabled={true} />);

      expect(screen.getByText('⏳')).toBeInTheDocument();
    });

    it('should show send icon when enabled', () => {
      const mockSend = vi.fn();
      render(<MessageInput onSendMessage={mockSend} disabled={false} />);

      expect(screen.getByText('▶')).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('should update textarea value when typing', async () => {
      const user = userEvent.setup();
      const mockSend = vi.fn();
      render(<MessageInput onSendMessage={mockSend} />);

      const textarea = screen.getByPlaceholderText('Type your message...');
      await user.type(textarea, 'Hello world');

      expect(textarea).toHaveValue('Hello world');
    });

    it('should call onSendMessage when clicking send button', async () => {
      const user = userEvent.setup();
      const mockSend = vi.fn();
      render(<MessageInput onSendMessage={mockSend} />);

      const textarea = screen.getByPlaceholderText('Type your message...');
      await user.type(textarea, 'Test message');

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      await user.click(sendButton);

      expect(mockSend).toHaveBeenCalledWith('Test message');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should clear textarea after sending message', async () => {
      const user = userEvent.setup();
      const mockSend = vi.fn();
      render(<MessageInput onSendMessage={mockSend} />);

      const textarea = screen.getByPlaceholderText('Type your message...');
      await user.type(textarea, 'Test message');
      await user.click(screen.getByRole('button', { name: 'Send message' }));

      expect(textarea).toHaveValue('');
    });

    it('should send message on Enter key press', async () => {
      const mockSend = vi.fn();
      render(<MessageInput onSendMessage={mockSend} />);

      const textarea = screen.getByPlaceholderText('Type your message...');
      await userEvent.type(textarea, 'Test message{Enter}');

      expect(mockSend).toHaveBeenCalledWith('Test message');
    });

    it('should not send message on Shift+Enter', async () => {
      const mockSend = vi.fn();
      render(<MessageInput onSendMessage={mockSend} />);

      const textarea = screen.getByPlaceholderText('Type your message...');
      await userEvent.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

      expect(mockSend).not.toHaveBeenCalled();
      expect(textarea).toHaveValue('Line 1\nLine 2');
    });

    it('should trim whitespace from messages', async () => {
      const user = userEvent.setup();
      const mockSend = vi.fn();
      render(<MessageInput onSendMessage={mockSend} />);

      const textarea = screen.getByPlaceholderText('Type your message...');
      await user.type(textarea, '  Test message  ');
      await user.click(screen.getByRole('button', { name: 'Send message' }));

      expect(mockSend).toHaveBeenCalledWith('Test message');
    });

    it('should not send empty or whitespace-only messages', async () => {
      const user = userEvent.setup();
      const mockSend = vi.fn();
      render(<MessageInput onSendMessage={mockSend} />);

      const textarea = screen.getByPlaceholderText('Type your message...');
      await user.type(textarea, '   ');
      await user.click(screen.getByRole('button', { name: 'Send message' }));

      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable textarea when disabled prop is true', () => {
      const mockSend = vi.fn();
      render(<MessageInput onSendMessage={mockSend} disabled={true} />);

      const textarea = screen.getByPlaceholderText('Type your message...');
      expect(textarea).toBeDisabled();
    });

    it('should disable send button when disabled prop is true', () => {
      const mockSend = vi.fn();
      render(<MessageInput onSendMessage={mockSend} disabled={true} />);

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toBeDisabled();
    });

    it('should disable send button when textarea is empty', () => {
      const mockSend = vi.fn();
      render(<MessageInput onSendMessage={mockSend} />);

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toBeDisabled();
    });

    it('should enable send button when textarea has content', async () => {
      const user = userEvent.setup();
      const mockSend = vi.fn();
      render(<MessageInput onSendMessage={mockSend} />);

      const textarea = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      expect(sendButton).toBeDisabled();

      await user.type(textarea, 'Test');

      expect(sendButton).not.toBeDisabled();
    });

    it('should not send message when disabled', async () => {
      const user = userEvent.setup();
      const mockSend = vi.fn();
      render(<MessageInput onSendMessage={mockSend} disabled={true} />);

      const textarea = screen.getByPlaceholderText('Type your message...');
      await user.type(textarea, 'Test message');

      // Try to send via button (should not work as button is disabled)
      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toBeDisabled();

      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button with aria-label', () => {
      const mockSend = vi.fn();
      render(<MessageInput onSendMessage={mockSend} />);

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toHaveAttribute('aria-label', 'Send message');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      const mockSend = vi.fn();
      render(<MessageInput onSendMessage={mockSend} />);

      const textarea = screen.getByPlaceholderText('Type your message...');
      await user.tab();

      expect(textarea).toHaveFocus();

      await user.type(textarea, 'Test');
      await user.tab();

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toHaveFocus();
    });
  });
});
