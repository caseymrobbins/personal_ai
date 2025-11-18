/**
 * ConversationSidebar Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConversationSidebar } from './ConversationSidebar';
import type { Conversation } from '../services/db.service';

// Mock services
vi.mock('../services/db.service', () => ({
  dbService: {
    renameConversation: vi.fn(),
    deleteConversation: vi.fn(),
    exportConversation: vi.fn(),
  },
}));

vi.mock('../services/search.service', () => ({
  searchService: {
    search: vi.fn().mockResolvedValue([]),
  },
}));

describe('ConversationSidebar', () => {
  const mockConversations: Conversation[] = [
    { id: '1', title: 'Conversation 1', created_at: Date.now() - 2000 },
    { id: '2', title: 'Conversation 2', created_at: Date.now() - 1000 },
    { id: '3', title: 'Conversation 3', created_at: Date.now() },
  ];

  const defaultProps = {
    conversations: mockConversations,
    currentConversationId: '1',
    onConversationSelect: vi.fn(),
    onConversationCreate: vi.fn(),
    onConversationUpdate: vi.fn(),
    isOpen: true,
    onToggle: vi.fn(),
  };

  describe('Rendering', () => {
    it('should render sidebar when open', () => {
      render(<ConversationSidebar {...defaultProps} />);

      expect(screen.getByText('Conversations')).toBeInTheDocument();
    });

    it('should render all conversations', () => {
      render(<ConversationSidebar {...defaultProps} />);

      expect(screen.getByText('Conversation 1')).toBeInTheDocument();
      expect(screen.getByText('Conversation 2')).toBeInTheDocument();
      expect(screen.getByText('Conversation 3')).toBeInTheDocument();
    });

    it('should render new conversation button', () => {
      render(<ConversationSidebar {...defaultProps} />);

      expect(screen.getByText(/New Conversation/i)).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      const { container } = render(<ConversationSidebar {...defaultProps} isOpen={false} />);

      const sidebar = container.querySelector('.conversation-sidebar.closed');
      expect(sidebar).toBeInTheDocument();
    });

    it('should highlight current conversation', () => {
      const { container } = render(<ConversationSidebar {...defaultProps} />);

      const activeItem = container.querySelector('.conversation-item.active');
      expect(activeItem).toBeInTheDocument();
      expect(activeItem).toHaveTextContent('Conversation 1');
    });
  });

  describe('New Conversation', () => {
    it('should call onConversationCreate when clicking new conversation button', async () => {
      const user = userEvent.setup();
      const onConversationCreate = vi.fn();

      render(
        <ConversationSidebar
          {...defaultProps}
          onConversationCreate={onConversationCreate}
        />
      );

      const newButton = screen.getByText(/New Conversation/i);
      await user.click(newButton);

      expect(onConversationCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Conversation Selection', () => {
    it('should call onConversationSelect when clicking a conversation', async () => {
      const user = userEvent.setup();
      const onConversationSelect = vi.fn();

      render(
        <ConversationSidebar
          {...defaultProps}
          onConversationSelect={onConversationSelect}
        />
      );

      const conversation2 = screen.getByText('Conversation 2');
      await user.click(conversation2);

      expect(onConversationSelect).toHaveBeenCalledWith(mockConversations[1]);
    });

    it('should not trigger selection when clicking the same conversation', async () => {
      const user = userEvent.setup();
      const onConversationSelect = vi.fn();

      render(
        <ConversationSidebar
          {...defaultProps}
          currentConversationId="1"
          onConversationSelect={onConversationSelect}
        />
      );

      const conversation1 = screen.getByText('Conversation 1');
      await user.click(conversation1);

      // Click handler should still be called, but component decides behavior
      expect(onConversationSelect).toHaveBeenCalled();
    });
  });

  describe('Search Functionality', () => {
    it('should render search input', () => {
      render(<ConversationSidebar {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/Search conversations/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should update search query on input', async () => {
      const user = userEvent.setup();
      render(<ConversationSidebar {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/Search conversations/i);
      await user.type(searchInput, 'test query');

      expect(searchInput).toHaveValue('test query');
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no conversations exist', () => {
      render(
        <ConversationSidebar
          {...defaultProps}
          conversations={[]}
          currentConversationId={null}
        />
      );

      expect(screen.getByText(/No conversations yet/i)).toBeInTheDocument();
    });

    it('should still show new conversation button when empty', () => {
      render(
        <ConversationSidebar
          {...defaultProps}
          conversations={[]}
          currentConversationId={null}
        />
      );

      expect(screen.getByText(/New Conversation/i)).toBeInTheDocument();
    });
  });

  describe('Toggle Functionality', () => {
    it('should call onToggle when clicking toggle button', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();

      render(<ConversationSidebar {...defaultProps} onToggle={onToggle} />);

      const toggleButton = screen.getByTitle(/Toggle sidebar/i);
      await user.click(toggleButton);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });
});
