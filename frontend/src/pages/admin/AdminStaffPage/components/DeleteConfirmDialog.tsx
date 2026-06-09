import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DeleteConfirmDialogProps {
  name: string;
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteConfirmDialog({
  name,
  open,
  onConfirm,
  onClose,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-border bg-card text-foreground max-w-[400px] sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg font-bold">
            Delete staff member
          </DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground mt-2 mb-5 text-sm leading-relaxed">
          Are you sure you want to delete{' '}
          <strong className="text-foreground">{name}</strong>? This action
          cannot be undone.
        </p>
        <div className="flex justify-end gap-2.5">
          <Button
            variant="outline"
            className="border-border text-foreground"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
