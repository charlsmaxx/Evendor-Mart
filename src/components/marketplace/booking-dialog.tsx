"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookingForm, type BookingFormProps } from "@/components/marketplace/booking-form";

type BookingDialogProps = BookingFormProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
};

export function BookingDialog({
  open,
  onOpenChange,
  title = "Book now",
  onSuccess,
  ...formProps
}: BookingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
        </DialogHeader>
        <BookingForm
          {...formProps}
          onSuccess={() => {
            onOpenChange(false);
            onSuccess?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
