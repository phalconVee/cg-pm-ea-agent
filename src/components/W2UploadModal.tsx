import React, { useState, useRef } from 'react';
import './W2UploadModal.css';

interface W2UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (file: File) => void;
}

const W2UploadModal: React.FC<W2UploadModalProps> = ({ isOpen, onClose, onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
    setIsProcessing(true);

    // Simulate processing delay (800-1200ms)
    const delay = Math.floor(Math.random() * 400) + 800;
    
    setTimeout(() => {
      setIsProcessing(false);
      onUploadComplete(file);
      // Close modal after a brief success state
      setTimeout(() => {
        onClose();
        setUploadedFile(null);
        setIsProcessing(false);
      }, 1000);
    }, delay);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w2-modal-overlay" onClick={onClose}>
      <div className="w2-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="w2-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        
        <div className="w2-modal-header">
          <div className="w2-modal-icon">📄</div>
          <h2 className="w2-modal-title">Upload your W-2</h2>
          <p className="w2-modal-subtitle">
            Your documents are handled securely
            <span className="security-icon">🔒</span>
          </p>
        </div>

        {!uploadedFile ? (
          <div
            className={`w2-upload-zone ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
            
            {isProcessing ? (
              <div className="w2-processing">
                <div className="w2-spinner"></div>
                <p>Processing your W-2...</p>
              </div>
            ) : (
              <>
                <div className="w2-upload-icon">📤</div>
                <p className="w2-upload-text">
                  Drag and drop your W-2 here, or click to browse
                </p>
                <p className="w2-upload-hint">
                  PDF, PNG, or JPG (max 10MB)
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="w2-upload-success">
            <div className="w2-success-icon">✅</div>
            <p className="w2-success-text">W-2 uploaded successfully</p>
            <p className="w2-filename">{uploadedFile.name}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default W2UploadModal;
