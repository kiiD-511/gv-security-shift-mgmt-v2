// src/components/Modal.jsx
import { useEffect } from "react";
import "../styles/Dash.css";
export default function Modal({ title,isOpen, onClose, children }) {
  // Close modal on ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
     <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
      >
        {title && <h2 className="modal-title">{title}</h2>}
        <div>{children}</div>
      </div>
    </div>
  );
}


