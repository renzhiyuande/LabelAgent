import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function LHConfirmDialog({
  open,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  danger = false,
  loading = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!open) {
      setClosing(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function handleClose() {
    if (loading) {
      return;
    }
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 180);
  }

  return (
    <aside
      className={`lh-confirm-overlay ${closing ? "lh-confirm-overlay--closing" : ""}`}
      onClick={handleClose}
    >
      <section
        className={`lh-confirm-dialog ${closing ? "lh-confirm-dialog--closing" : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="lh-confirm-dialog-header">
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </header>
        <footer className="lh-confirm-dialog-footer">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={danger ? "destructive" : "default"}
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading ? "处理中..." : confirmText}
          </Button>
        </footer>
      </section>
    </aside>
  );
}
