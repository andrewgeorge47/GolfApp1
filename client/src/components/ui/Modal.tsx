import React from 'react';
import { X, AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './Button';

// ============================================================
// Modal Component
// ============================================================

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-7xl mx-4'
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = ''
}) => {
  const modalRef = React.useRef<HTMLDivElement>(null);

  // Handle escape key
  React.useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, closeOnEscape, onClose]);

  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Focus trap
  React.useEffect(() => {
    if (!open) return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements?.[0] as HTMLElement;
    const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => document.removeEventListener('keydown', handleTab);
  }, [open]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className={`
          relative bg-white rounded-xl shadow-2xl
          w-full ${sizeStyles[size]}
          animate-scale-in
          ${className}
        `}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        )}

        {children}
      </div>
    </div>
  );
};

Modal.displayName = 'Modal';

// ============================================================
// Modal Subcomponents
// ============================================================

export interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`px-6 pt-6 pb-4 border-b border-gray-200 ${className}`}>
      <h2 className="text-heading-lg text-brand-black font-semibold pr-8">
        {children}
      </h2>
    </div>
  );
};

ModalHeader.displayName = 'ModalHeader';

export interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalContent: React.FC<ModalContentProps> = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
};

ModalContent.displayName = 'ModalContent';

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 ${className}`}>
      {children}
    </div>
  );
};

ModalFooter.displayName = 'ModalFooter';

// ============================================================
// Confirmation Dialog
// ============================================================

export type ConfirmationVariant = 'info' | 'success' | 'warning' | 'danger';

export interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  variant?: ConfirmationVariant;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

const variantConfig: Record<ConfirmationVariant, { icon: React.FC<any>; color: string }> = {
  info: { icon: Info, color: 'info' },
  success: { icon: CheckCircle, color: 'success' },
  warning: { icon: AlertTriangle, color: 'warning' },
  danger: { icon: AlertCircle, color: 'error' }
};

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'info',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const buttonVariant = variant === 'danger' ? 'danger' : 'primary';

  return (
    <Modal open={open} onClose={onClose} size="sm" showCloseButton={false}>
      <ModalContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 p-3 rounded-full bg-${config.color}-100`}>
            <Icon className={`h-6 w-6 text-${config.color}-600`} />
          </div>
          <div className="flex-1 mt-1">
            <h3 className="text-heading-sm text-brand-black font-semibold mb-2">
              {title}
            </h3>
            <div className="text-base text-gray-600">
              {message}
            </div>
          </div>
        </div>
      </ModalContent>

      <ModalFooter>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          variant={buttonVariant}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

ConfirmationDialog.displayName = 'ConfirmationDialog';

// ============================================================
// Form Dialog
// ============================================================

export interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  children: React.ReactNode;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  size?: ModalSize;
}

export const FormDialog: React.FC<FormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  title,
  children,
  submitText = 'Submit',
  cancelText = 'Cancel',
  loading = false,
  size = 'md'
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <Modal open={open} onClose={onClose} size={size}>
      <form onSubmit={handleSubmit}>
        <ModalHeader>{title}</ModalHeader>
        <ModalContent>{children}</ModalContent>
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            {submitText}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

FormDialog.displayName = 'FormDialog';

// ============================================================
// Drawer Component (Side Modal)
// ============================================================

export type DrawerPosition = 'left' | 'right';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: DrawerPosition;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  children,
  position = 'right',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = ''
}) => {
  // Handle escape key
  React.useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, closeOnEscape, onClose]);

  // Lock body scroll
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

  const slideAnimation = position === 'left' ? 'animate-slide-in-left' : 'animate-slide-in-right';

  return (
    <div
      className="fixed inset-0 z-50 animate-fade-in"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        className={`
          absolute top-0 ${position === 'left' ? 'left-0' : 'right-0'} bottom-0
          w-full max-w-md bg-white shadow-2xl
          ${slideAnimation}
          ${className}
        `}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
            aria-label="Close drawer"
          >
            <X className="h-6 w-6" />
          </button>
        )}

        {children}
      </div>
    </div>
  );
};

Drawer.displayName = 'Drawer';
