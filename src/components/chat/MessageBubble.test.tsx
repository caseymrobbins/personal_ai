/**
 * MessageBubble Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from './MessageBubble';

describe('MessageBubble', () => {
  describe('Rendering', () => {
    it('should render user message correctly', () => {
      render(<MessageBubble role="user" content="Hello, how are you?" />);

      expect(screen.getByText('👤 You')).toBeInTheDocument();
      expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
    });

    it('should render assistant message correctly', () => {
      render(<MessageBubble role="assistant" content="I'm doing well, thank you!" />);

      expect(screen.getByText('🤖 AI')).toBeInTheDocument();
      expect(screen.getByText("I'm doing well, thank you!")).toBeInTheDocument();
    });

    it('should render system message correctly', () => {
      render(<MessageBubble role="system" content="System notification" />);

      expect(screen.getByText('⚙️ System')).toBeInTheDocument();
      expect(screen.getByText('System notification')).toBeInTheDocument();
    });

    it('should apply correct CSS class for user role', () => {
      const { container } = render(<MessageBubble role="user" content="Test" />);

      const bubble = container.querySelector('.message-bubble');
      expect(bubble).toHaveClass('message-user');
    });

    it('should apply correct CSS class for assistant role', () => {
      const { container } = render(<MessageBubble role="assistant" content="Test" />);

      const bubble = container.querySelector('.message-bubble');
      expect(bubble).toHaveClass('message-assistant');
    });

    it('should apply correct CSS class for system role', () => {
      const { container } = render(<MessageBubble role="system" content="Test" />);

      const bubble = container.querySelector('.message-bubble');
      expect(bubble).toHaveClass('message-system');
    });
  });

  describe('Timestamp Display', () => {
    it('should display timestamp when provided', () => {
      const timestamp = new Date('2024-01-15T10:30:00').getTime();
      render(<MessageBubble role="user" content="Test" timestamp={timestamp} />);

      // Should display formatted time
      expect(screen.getByText(/10:30/)).toBeInTheDocument();
    });

    it('should not display timestamp when not provided', () => {
      const { container } = render(<MessageBubble role="user" content="Test" />);

      const timeElement = container.querySelector('.message-time');
      expect(timeElement).not.toBeInTheDocument();
    });

    it('should format timestamp correctly', () => {
      const timestamp = new Date('2024-01-15T14:45:00').getTime();
      render(<MessageBubble role="user" content="Test" timestamp={timestamp} />);

      // Format may vary by locale, but should contain hour and minute
      const timeElement = screen.getByText(/\d{1,2}:\d{2}/);
      expect(timeElement).toBeInTheDocument();
    });
  });

  describe('Module Used Display', () => {
    it('should display module name for assistant messages', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Response"
          moduleUsed="OpenAI GPT-4"
        />
      );

      expect(screen.getByText('via OpenAI GPT-4')).toBeInTheDocument();
    });

    it('should not display module for user messages even if provided', () => {
      render(
        <MessageBubble
          role="user"
          content="Question"
          moduleUsed="OpenAI GPT-4"
        />
      );

      expect(screen.queryByText(/via OpenAI GPT-4/)).not.toBeInTheDocument();
    });

    it('should not display module for system messages even if provided', () => {
      render(
        <MessageBubble
          role="system"
          content="Notification"
          moduleUsed="OpenAI GPT-4"
        />
      );

      expect(screen.queryByText(/via OpenAI GPT-4/)).not.toBeInTheDocument();
    });

    it('should not display module footer when moduleUsed is null', () => {
      const { container } = render(
        <MessageBubble
          role="assistant"
          content="Response"
          moduleUsed={null}
        />
      );

      const footer = container.querySelector('.message-footer');
      expect(footer).not.toBeInTheDocument();
    });

    it('should not display module footer when moduleUsed is undefined', () => {
      const { container } = render(
        <MessageBubble
          role="assistant"
          content="Response"
        />
      );

      const footer = container.querySelector('.message-footer');
      expect(footer).not.toBeInTheDocument();
    });
  });

  describe('Content Display', () => {
    it('should display multiline content correctly', () => {
      const multilineContent = 'Line 1\nLine 2\nLine 3';
      render(<MessageBubble role="user" content={multilineContent} />);

      const messageContent = screen.getByText((content, element) => {
        return element?.className === 'message-content' && element.textContent === multilineContent;
      });
      expect(messageContent).toBeInTheDocument();
    });

    it('should display long content correctly', () => {
      const longContent = 'A'.repeat(1000);
      render(<MessageBubble role="user" content={longContent} />);

      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it('should display empty content', () => {
      render(<MessageBubble role="user" content="" />);

      const messageContent = document.querySelector('.message-content');
      expect(messageContent).toBeInTheDocument();
      expect(messageContent).toHaveTextContent('');
    });

    it('should display special characters correctly', () => {
      const specialContent = '< > & " \' ` {} [] () @#$%^&*';
      render(<MessageBubble role="user" content={specialContent} />);

      expect(screen.getByText(specialContent)).toBeInTheDocument();
    });
  });

  describe('Combined Props', () => {
    it('should render all props together correctly', () => {
      const timestamp = new Date('2024-01-15T10:30:00').getTime();
      render(
        <MessageBubble
          role="assistant"
          content="Complete response"
          timestamp={timestamp}
          moduleUsed="Anthropic Claude"
        />
      );

      expect(screen.getByText('🤖 AI')).toBeInTheDocument();
      expect(screen.getByText('Complete response')).toBeInTheDocument();
      expect(screen.getByText(/10:30/)).toBeInTheDocument();
      expect(screen.getByText('via Anthropic Claude')).toBeInTheDocument();
    });
  });

  describe('Structure', () => {
    it('should have correct DOM structure', () => {
      const { container } = render(
        <MessageBubble
          role="assistant"
          content="Test"
          timestamp={Date.now()}
          moduleUsed="OpenAI"
        />
      );

      const bubble = container.querySelector('.message-bubble');
      const header = bubble?.querySelector('.message-header');
      const content = bubble?.querySelector('.message-content');
      const footer = bubble?.querySelector('.message-footer');

      expect(bubble).toBeInTheDocument();
      expect(header).toBeInTheDocument();
      expect(content).toBeInTheDocument();
      expect(footer).toBeInTheDocument();
    });
  });
});
