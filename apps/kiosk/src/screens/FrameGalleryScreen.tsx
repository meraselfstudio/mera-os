import React, { useState } from 'react';
import { useKioskStore } from '../store/useKioskStore';

// Dummy frame data, replace with API call or props
const FRAMES = [
  { id: 'basic_black', name: 'Basic Black', type: 'basic', price: 0, image: '/frames/basic_black.png' },
  { id: 'basic_white', name: 'Basic White', type: 'basic', price: 0, image: '/frames/basic_white.png' },
  { id: 'special_lebaran', name: 'Lebaran Edition', type: 'special', price: 25000, image: '/frames/special_lebaran.png' },
  { id: 'special_wedding', name: 'Wedding Edition', type: 'special', price: 25000, image: '/frames/special_wedding.png' },
];

export default function FrameGalleryScreen() {
  const { selectedPhoto, selectFrame, selectedFrame } = useKioskStore();
  const [previewFrame, setPreviewFrame] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingFrame, setPendingFrame] = useState(null);

  const handleFrameClick = (frame) => {
    if (frame.type === 'special') {
      setPendingFrame(frame);
      setShowConfirm(true);
    } else {
      selectFrame(frame);
      setPreviewFrame(frame);
    }
  };

  const confirmSpecialFrame = () => {
    selectFrame(pendingFrame);
    setPreviewFrame(pendingFrame);
    setShowConfirm(false);
    setPendingFrame(null);
  };

  return (
    <div className="frame-gallery-screen">
      <h2>Pilih Bingkai</h2>
      <div className="frame-grid">
        {FRAMES.map((frame) => (
          <div
            key={frame.id}
            className={`frame-item ${selectedFrame?.id === frame.id ? 'selected' : ''}`}
            onClick={() => handleFrameClick(frame)}
          >
            <img src={frame.image} alt={frame.name} className="frame-thumb" />
            <div className="frame-label">{frame.name}</div>
            {frame.type === 'special' && (
              <div className="frame-price">+Rp{frame.price.toLocaleString()}</div>
            )}
          </div>
        ))}
      </div>
      {previewFrame && selectedPhoto && (
        <div className="live-preview">
          <div className="preview-container">
            <img src={selectedPhoto} alt="Preview" className="photo-preview" />
            <img src={previewFrame.image} alt="Frame Overlay" className="frame-overlay" style={{ opacity: previewFrame.type === 'special' ? 0.7 : 1 }} />
            {previewFrame.type === 'special' && <div className="watermark">PREVIEW</div>}
          </div>
        </div>
      )}
      {showConfirm && pendingFrame && (
        <div className="confirm-modal">
          <div>Special Frame <b>{pendingFrame.name}</b> akan menambah biaya Rp{pendingFrame.price.toLocaleString()}. Lanjutkan?</div>
          <button onClick={confirmSpecialFrame}>Ya, Pilih</button>
          <button onClick={() => setShowConfirm(false)}>Batal</button>
        </div>
      )}
    </div>
  );
}
