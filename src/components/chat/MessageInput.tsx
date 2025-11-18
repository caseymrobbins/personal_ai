/**
 * Message Input Component
 *
 * Chat input box with send button and image attachment support
 */

import { useState, KeyboardEvent, useRef, ChangeEvent, useEffect } from 'react';
import { attachmentsService } from '../../services/attachments.service';
import { documentParsingService } from '../../services/document.service';
import { voiceService, type VoiceServiceEvent } from '../../services/voice.service';
import './MessageInput.css';

export interface MessageInputProps {
  onSendMessage: (message: string, imageFiles?: File[], documentFiles?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Type your message...',
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Check voice support
  const voiceSupported = voiceService.isSpeechRecognitionSupported();

  // Set up voice event listeners
  useEffect(() => {
    const handleVoiceEvent = (event: VoiceServiceEvent) => {
      switch (event.type) {
        case 'stt-start':
          setIsListening(true);
          setInterimTranscript('');
          break;

        case 'stt-result':
          if (event.result.isFinal) {
            // Append final result to message
            setMessage(prev => {
              const newText = prev ? `${prev} ${event.result.transcript}` : event.result.transcript;
              return newText.trim();
            });
            setInterimTranscript('');
          } else {
            // Show interim result
            setInterimTranscript(event.result.transcript);
          }
          break;

        case 'stt-end':
          setIsListening(false);
          setInterimTranscript('');
          break;

        case 'stt-error':
          setIsListening(false);
          setInterimTranscript('');
          console.error('[MessageInput] Voice error:', event.error);
          break;
      }
    };

    voiceService.addEventListener(handleVoiceEvent);
    return () => voiceService.removeEventListener(handleVoiceEvent);
  }, []);

  const handleSend = () => {
    const trimmed = message.trim();
    // Allow sending if there's text, images, or documents
    if ((trimmed || selectedImages.length > 0 || selectedDocuments.length > 0) && !disabled && !validationError) {
      onSendMessage(
        trimmed,
        selectedImages.length > 0 ? selectedImages : undefined,
        selectedDocuments.length > 0 ? selectedDocuments : undefined
      );
      setMessage('');
      clearImages();
      clearDocuments();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setValidationError('');

    // Validate all files before adding
    const validFiles: File[] = [];
    const previews: string[] = [];

    for (const file of files) {
      const validation = attachmentsService.validateImageFile(file);
      if (!validation.valid) {
        setValidationError(validation.error || 'Invalid image file');
        continue;
      }

      // Create preview
      const previewUrl = URL.createObjectURL(file);
      validFiles.push(file);
      previews.push(previewUrl);
    }

    if (validFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...validFiles]);
      setImagePreviews(prev => [...prev, ...previews]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(imagePreviews[index]);

    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setValidationError('');
  };

  const clearImages = () => {
    // Revoke all object URLs
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setSelectedImages([]);
    setImagePreviews([]);
    setValidationError('');
  };

  const handleDocumentSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setValidationError('');

    // Validate all files before adding
    const validFiles: File[] = [];

    for (const file of files) {
      const validation = documentParsingService.validateDocumentFile(file);
      if (!validation.valid) {
        setValidationError(validation.error || 'Invalid document file');
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setSelectedDocuments(prev => [...prev, ...validFiles]);
    }

    // Reset file input
    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
  };

  const removeDocument = (index: number) => {
    setSelectedDocuments(prev => prev.filter((_, i) => i !== index));
    setValidationError('');
  };

  const clearDocuments = () => {
    setSelectedDocuments([]);
    setValidationError('');
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      voiceService.stopListening();
    } else {
      voiceService.startListening();
    }
  };

  return (
    <div className="message-input-wrapper">
      {/* Image Previews */}
      {imagePreviews.length > 0 && (
        <div className="image-previews">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="image-preview">
              <img src={preview} alt={`Preview ${index + 1}`} />
              <button
                className="remove-image-button"
                onClick={() => removeImage(index)}
                aria-label="Remove image"
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Document Previews */}
      {selectedDocuments.length > 0 && (
        <div className="document-previews">
          {selectedDocuments.map((doc, index) => (
            <div key={index} className="document-preview">
              <span className="document-icon">
                {documentParsingService.getFileTypeIcon(doc.type, doc.name)}
              </span>
              <span className="document-name">{doc.name}</span>
              <button
                className="remove-document-button"
                onClick={() => removeDocument(index)}
                aria-label="Remove document"
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <div className="image-validation-error">
          ⚠️ {validationError}
        </div>
      )}

      {/* Interim Transcript (voice recognition in progress) */}
      {interimTranscript && (
        <div className="interim-transcript">
          🎤 {interimTranscript}
        </div>
      )}

      <div className="message-input-container">
        {/* Hidden file input for images */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          onChange={handleImageSelect}
          style={{ display: 'none' }}
          aria-label="Select images"
        />

        {/* Hidden file input for documents */}
        <input
          ref={documentInputRef}
          type="file"
          accept="text/plain,text/markdown,.md,.markdown,application/pdf"
          multiple
          onChange={handleDocumentSelect}
          style={{ display: 'none' }}
          aria-label="Select documents"
        />

        {/* Attach image button */}
        <button
          className="attach-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="Attach image"
          type="button"
          title="Attach image (JPG, PNG, GIF, WebP)"
        >
          📎
        </button>

        {/* Attach document button */}
        <button
          className="attach-button"
          onClick={() => documentInputRef.current?.click()}
          disabled={disabled}
          aria-label="Attach document"
          type="button"
          title="Attach document (TXT, Markdown, PDF)"
        >
          📄
        </button>

        {/* Voice input button */}
        {voiceSupported && (
          <button
            className={`voice-button ${isListening ? 'listening' : ''}`}
            onClick={toggleVoiceInput}
            disabled={disabled}
            aria-label={isListening ? 'Stop recording' : 'Start voice input'}
            type="button"
          >
            {isListening ? '🔴' : '🎤'}
          </button>
        )}

        <textarea
          className="message-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          style={{
            minHeight: '44px',
            maxHeight: '200px',
            resize: 'none',
            overflow: 'auto',
          }}
        />

        <button
          className="send-button"
          onClick={handleSend}
          disabled={disabled || (!message.trim() && selectedImages.length === 0 && selectedDocuments.length === 0) || !!validationError}
          aria-label="Send message"
        >
          {disabled ? (
            <span className="loading-spinner">⏳</span>
          ) : (
            <span className="send-icon">▶</span>
          )}
        </button>
      </div>
    </div>
  );
}
