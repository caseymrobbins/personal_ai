/**
 * Message Input Component
 *
 * Chat input box with send button and image attachment support
 */

import { useState, KeyboardEvent, useRef, ChangeEvent } from 'react';
import { attachmentsService } from '../../services/attachments.service';
import './MessageInput.css';

export interface MessageInputProps {
  onSendMessage: (message: string, imageFiles?: File[]) => void;
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
  const [validationError, setValidationError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    // Allow sending if there's either text or images
    if ((trimmed || selectedImages.length > 0) && !disabled && !validationError) {
      onSendMessage(trimmed, selectedImages.length > 0 ? selectedImages : undefined);
      setMessage('');
      clearImages();
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

      {/* Validation Error */}
      {validationError && (
        <div className="image-validation-error">
          ⚠️ {validationError}
        </div>
      )}

      <div className="message-input-container">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          onChange={handleImageSelect}
          style={{ display: 'none' }}
          aria-label="Select images"
        />

        {/* Attach image button */}
        <button
          className="attach-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="Attach image"
          type="button"
        >
          📎
        </button>

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
          disabled={disabled || (!message.trim() && selectedImages.length === 0) || !!validationError}
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
