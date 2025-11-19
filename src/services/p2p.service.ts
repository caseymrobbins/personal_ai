/**
 * P2P Conversation Sharing Service
 *
 * Enables direct peer-to-peer sharing of conversations using WebRTC
 * - Direct peer connection via WebRTC DataChannel
 * - Automatic encryption/decryption
 * - Permission control (read-only, read-write)
 * - Connection state management
 */

import { dbService } from './db.service';

export type SharePermission = 'read-only' | 'read-write';
export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ShareLink {
  id: string;
  conversationId: string;
  permission: SharePermission;
  expiresAt: number;
  maxUses: number | null;
  usedCount: number;
  createdAt: number;
  shareCode: string;
}

export interface P2PConnection {
  peerId: string;
  state: ConnectionState;
  isInitiator: boolean;
  peerConnection: RTCPeerConnection | null;
  dataChannel: RTCDataChannel | null;
  createdAt: number;
}

export interface ShareEvent {
  type: 'message-received' | 'conversation-updated' | 'peer-joined' | 'peer-left' | 'error';
  data: any;
}

class P2PService extends EventTarget {
  private connections = new Map<string, P2PConnection>();
  private shareLinks = new Map<string, ShareLink>();
  private messageQueue: any[] = [];
  private _isConnected = false;

  // WebRTC config
  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      { urls: ['stun:stun2.l.google.com:19302', 'stun:stun3.l.google.com:19302'] },
    ],
  };

  constructor() {
    super();
  }

  /**
   * Generate a shareable link for a conversation
   */
  generateShareLink(
    conversationId: string,
    permission: SharePermission = 'read-only',
    expiryMinutes: number = 24 * 60, // 24 hours default
    maxUses: number | null = null
  ): ShareLink {
    const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const shareCode = this.generateShareCode();

    const shareLink: ShareLink = {
      id: shareId,
      conversationId,
      permission,
      expiresAt: Date.now() + expiryMinutes * 60 * 1000,
      maxUses,
      usedCount: 0,
      createdAt: Date.now(),
      shareCode,
    };

    this.shareLinks.set(shareId, shareLink);
    this.persistShareLinks();

    console.log('[P2PService] Generated share link:', shareCode);
    return shareLink;
  }

  /**
   * Get a share link by code
   */
  getShareLinkByCode(shareCode: string): ShareLink | null {
    for (const link of this.shareLinks.values()) {
      if (link.shareCode === shareCode && !this.isShareLinkExpired(link)) {
        return link;
      }
    }
    return null;
  }

  /**
   * Revoke a share link
   */
  revokeShareLink(shareId: string): void {
    this.shareLinks.delete(shareId);
    this.persistShareLinks();
    console.log('[P2PService] Revoked share link:', shareId);
  }

  /**
   * Check if share link is expired
   */
  private isShareLinkExpired(link: ShareLink): boolean {
    if (Date.now() > link.expiresAt) {
      return true;
    }
    if (link.maxUses !== null && link.usedCount >= link.maxUses) {
      return true;
    }
    return false;
  }

  /**
   * Initiate a peer connection to a remote peer
   */
  async connectToPeer(peerId: string, isInitiator: boolean = false): Promise<void> {
    try {
      console.log('[P2PService] Initiating peer connection:', peerId);

      if (this.connections.has(peerId)) {
        console.warn('[P2PService] Already connected to peer:', peerId);
        return;
      }

      const peerConnection = new RTCPeerConnection(this.rtcConfig);
      const connection: P2PConnection = {
        peerId,
        state: 'connecting',
        isInitiator,
        peerConnection,
        dataChannel: null,
        createdAt: Date.now(),
      };

      this.connections.set(peerId, connection);

      // Setup event handlers
      peerConnection.onicecandidate = (event) => this.handleIceCandidate(peerId, event);
      peerConnection.onconnectionstatechange = () =>
        this.handleConnectionStateChange(peerId);

      if (isInitiator) {
        // Create data channel as initiator
        const dataChannel = peerConnection.createDataChannel('conversation-share', {
          ordered: true,
        });
        this.setupDataChannel(peerId, dataChannel);
      } else {
        // Listen for data channel as responder
        peerConnection.ondatachannel = (event) => {
          this.setupDataChannel(peerId, event.channel);
        };
      }

      // Update state
      this.updateConnectionState(peerId, 'connecting');
    } catch (error) {
      console.error('[P2PService] Failed to connect to peer:', error);
      this.updateConnectionState(peerId, 'error');
      throw error;
    }
  }

  /**
   * Setup data channel communication
   */
  private setupDataChannel(peerId: string, dataChannel: RTCDataChannel): void {
    const connection = this.connections.get(peerId);
    if (!connection) return;

    connection.dataChannel = dataChannel;

    dataChannel.onopen = () => {
      console.log('[P2PService] Data channel opened:', peerId);
      this.updateConnectionState(peerId, 'connected');
      this.dispatchEvent(
        new CustomEvent('peer-joined', {
          detail: { peerId },
        })
      );

      // Flush message queue
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift();
        this.sendMessage(peerId, msg);
      }
    };

    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleRemoteMessage(peerId, data);
      } catch (error) {
        console.error('[P2PService] Failed to parse message:', error);
      }
    };

    dataChannel.onerror = (error) => {
      console.error('[P2PService] Data channel error:', error);
      this.updateConnectionState(peerId, 'error');
    };

    dataChannel.onclose = () => {
      console.log('[P2PService] Data channel closed:', peerId);
      this.updateConnectionState(peerId, 'disconnected');
      this.dispatchEvent(
        new CustomEvent('peer-left', {
          detail: { peerId },
        })
      );
    };
  }

  /**
   * Send a message through data channel
   */
  sendMessage(peerId: string, data: any): void {
    const connection = this.connections.get(peerId);

    if (!connection) {
      console.warn('[P2PService] Connection not found:', peerId);
      this.messageQueue.push(data);
      return;
    }

    if (connection.state !== 'connected' || !connection.dataChannel) {
      console.warn('[P2PService] Data channel not ready:', peerId);
      this.messageQueue.push(data);
      return;
    }

    try {
      connection.dataChannel.send(JSON.stringify(data));
    } catch (error) {
      console.error('[P2PService] Failed to send message:', error);
      this.messageQueue.push(data);
    }
  }

  /**
   * Handle incoming messages from remote peer
   */
  private handleRemoteMessage(peerId: string, data: any): void {
    console.log('[P2PService] Message received:', data.type);

    switch (data.type) {
      case 'conversation-share':
        this.handleConversationShare(peerId, data.payload);
        break;
      case 'message-update':
        this.handleMessageUpdate(peerId, data.payload);
        break;
      case 'permission-request':
        this.handlePermissionRequest(peerId, data.payload);
        break;
      default:
        console.warn('[P2PService] Unknown message type:', data.type);
    }
  }

  /**
   * Handle conversation share message
   */
  private handleConversationShare(peerId: string, payload: any): void {
    const event = new CustomEvent('conversation-received', {
      detail: {
        peerId,
        conversation: payload.conversation,
        messages: payload.messages,
        permission: payload.permission,
      },
    });
    this.dispatchEvent(event);
  }

  /**
   * Handle message update
   */
  private handleMessageUpdate(peerId: string, payload: any): void {
    const event = new CustomEvent('message-update-received', {
      detail: {
        peerId,
        message: payload.message,
      },
    });
    this.dispatchEvent(event);
  }

  /**
   * Handle permission request
   */
  private handlePermissionRequest(peerId: string, payload: any): void {
    const event = new CustomEvent('permission-request', {
      detail: {
        peerId,
        conversationId: payload.conversationId,
        permission: payload.permission,
      },
    });
    this.dispatchEvent(event);
  }

  /**
   * Handle ICE candidates
   */
  private handleIceCandidate(peerId: string, event: RTCPeerConnectionIceEvent): void {
    if (event.candidate) {
      const iceCandidate = {
        candidate: event.candidate.candidate,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        sdpMid: event.candidate.sdpMid,
      };

      this.dispatchEvent(
        new CustomEvent('ice-candidate', {
          detail: { peerId, iceCandidate },
        })
      );
    }
  }

  /**
   * Handle connection state changes
   */
  private handleConnectionStateChange(peerId: string): void {
    const connection = this.connections.get(peerId);
    if (!connection || !connection.peerConnection) return;

    const state = connection.peerConnection.connectionState as ConnectionState;
    console.log('[P2PService] Connection state changed:', peerId, state);
    this.updateConnectionState(peerId, state);
  }

  /**
   * Update connection state
   */
  private updateConnectionState(peerId: string, state: ConnectionState): void {
    const connection = this.connections.get(peerId);
    if (connection) {
      connection.state = state;
    }
  }

  /**
   * Get connection state
   */
  getConnectionState(peerId: string): ConnectionState {
    const connection = this.connections.get(peerId);
    return connection?.state || 'idle';
  }

  /**
   * Get all active connections
   */
  getConnections(): P2PConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Close a peer connection
   */
  async closePeerConnection(peerId: string): Promise<void> {
    const connection = this.connections.get(peerId);
    if (!connection) return;

    if (connection.dataChannel) {
      connection.dataChannel.close();
    }

    if (connection.peerConnection) {
      connection.peerConnection.close();
    }

    this.connections.delete(peerId);
    console.log('[P2PService] Closed peer connection:', peerId);
  }

  /**
   * Share a conversation with a peer
   */
  async shareConversation(
    peerId: string,
    conversationId: string,
    permission: SharePermission
  ): Promise<void> {
    const conversation = dbService.getConversation(conversationId);
    const messages = dbService.getConversationHistory(conversationId);

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    this.sendMessage(peerId, {
      type: 'conversation-share',
      payload: {
        conversation,
        messages,
        permission,
      },
    });

    console.log('[P2PService] Shared conversation:', conversationId, 'with peer:', peerId);
  }

  /**
   * Generate a random share code
   */
  private generateShareCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Persist share links to storage
   */
  private persistShareLinks(): void {
    const linksData = Array.from(this.shareLinks.entries());
    localStorage.setItem('p2p_share_links', JSON.stringify(linksData));
  }

  /**
   * Load share links from storage
   */
  private loadShareLinks(): void {
    try {
      const data = localStorage.getItem('p2p_share_links');
      if (data) {
        const linksData = JSON.parse(data);
        for (const [id, link] of linksData) {
          this.shareLinks.set(id, link);
        }
        console.log('[P2PService] Loaded share links:', this.shareLinks.size);
      }
    } catch (error) {
      console.error('[P2PService] Failed to load share links:', error);
    }
  }

  /**
   * Initialize service
   */
  initialize(): void {
    this.loadShareLinks();
    console.log('[P2PService] Initialized');
  }

  /**
   * Cleanup service
   */
  destroy(): void {
    for (const peerId of this.connections.keys()) {
      this.closePeerConnection(peerId);
    }
    this.connections.clear();
    console.log('[P2PService] Destroyed');
  }
}

// Export singleton instance
export const p2pService = new P2PService();
