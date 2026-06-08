import { useEffect, useState } from 'react';
import { QRCode } from 'react-qr-code';

import { cn } from '@/lib/utils';

import type { GenerateTokenResponse } from '@/hooks/useEntry';
import type { UseMutationResult } from '@tanstack/react-query';

const TOKEN_TTL_SECONDS = 5 * 60;

interface QrAccessPanelProps {
  mutation: Pick<
    UseMutationResult<GenerateTokenResponse, Error, void>,
    'mutate' | 'isPending'
  >;
  disabled?: boolean;
  triggerLabel?: string;
  instruction?: string;
  onVisibilityChange?: (visible: boolean) => void;
  /** When flipped to true by the parent (scan detected), auto-closes the panel. */
  forceClose?: boolean;
}

export default function QrAccessPanel({
  mutation,
  disabled = false,
  triggerLabel = 'Show QR code',
  instruction = 'Show this to staff at the entrance',
  onVisibilityChange,
  forceClose = false,
}: QrAccessPanelProps) {
  const [showQr, setShowQr] = useState(false);

  const setShowQrWithCallback = (visible: boolean) => {
    setShowQr(visible);
    onVisibilityChange?.(visible);
  };

  useEffect(() => {
    if (forceClose && showQr) setShowQrWithCallback(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceClose]);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<Date | null>(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(0);

  const generateQr = () => {
    mutation.mutate(undefined, {
      onSuccess: (data) => {
        setQrToken(data.token);
        setQrExpiresAt(new Date(data.expiresAt));
        setQrSecondsLeft(TOKEN_TTL_SECONDS);
      },
    });
  };

  useEffect(() => {
    if (!showQr) {
      setQrToken(null);
      setQrExpiresAt(null);
      setQrSecondsLeft(0);
      return;
    }
    generateQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showQr]);

  useEffect(() => {
    if (!qrExpiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((qrExpiresAt.getTime() - Date.now()) / 1000),
      );
      setQrSecondsLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [qrExpiresAt]);

  const qrExpired = qrSecondsLeft <= 0 && showQr && !mutation.isPending;
  const qrMinutes = Math.floor(qrSecondsLeft / 60);
  const qrSeconds = qrSecondsLeft % 60;

  if (!showQr) {
    return (
      <button
        onClick={() => setShowQrWithCallback(true)}
        disabled={disabled}
        className="bg-primary text-primary-foreground hover:bg-primary/90 w-full cursor-pointer rounded-lg py-2 text-[0.82rem] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 pt-1">
      {mutation.isPending ? (
        <div className="text-muted-foreground py-6 text-[0.85rem]">
          Generating QR code…
        </div>
      ) : qrToken && !qrExpired ? (
        <>
          <div className="rounded-xl bg-white p-3">
            <QRCode value={qrToken} size={180} />
          </div>
          <div className="text-center">
            <p className="text-foreground text-[0.88rem] font-semibold">
              {instruction}
            </p>
            <p
              className={cn(
                'mt-1 text-[1.1rem] font-extrabold tabular-nums',
                qrSecondsLeft <= 60 ? 'text-destructive' : 'text-primary',
              )}
            >
              {String(qrMinutes).padStart(2, '0')}:
              {String(qrSeconds).padStart(2, '0')}
            </p>
            <p className="text-muted-foreground text-[0.72rem]">expires in</p>
          </div>
        </>
      ) : (
        <>
          <div className="bg-muted rounded-xl p-3">
            <div className="flex size-[180px] items-center justify-center">
              <p className="text-muted-foreground text-center text-[0.82rem]">
                QR code expired
              </p>
            </div>
          </div>
          <button
            onClick={generateQr}
            disabled={mutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full cursor-pointer rounded-lg py-2 text-[0.82rem] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            Regenerate
          </button>
        </>
      )}
      <button
        onClick={() => setShowQrWithCallback(false)}
        className="border-border text-muted-foreground hover:text-foreground w-full cursor-pointer rounded-lg border bg-transparent py-2 text-[0.82rem] font-semibold transition-colors"
      >
        Hide
      </button>
    </div>
  );
}
