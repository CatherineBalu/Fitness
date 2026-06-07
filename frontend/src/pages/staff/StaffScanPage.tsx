import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useScanEntry, type ScanResult } from '@/hooks/useEntry';

type ScanState =
  | { status: 'scanning' }
  | { status: 'success'; result: ScanResult }
  | { status: 'error'; message: string };

const QR_ELEMENT_ID = 'staff-qr-reader';
const RESET_DELAY_MS = 3000;

async function stopScanner(scanner: Html5Qrcode) {
  try {
    await scanner.stop();
  } catch {
    // scanner was not running — ignore
  }
}

export default function StaffScanPage() {
  const [state, setState] = useState<ScanState>({ status: 'scanning' });
  const scanMutation = useScanEntry();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const mountedRef = useRef(true);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startScanner = () => {
    if (!mountedRef.current) return;

    const scanner = new Html5Qrcode(QR_ELEMENT_ID);
    scannerRef.current = scanner;
    processingRef.current = false;

    void (async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (processingRef.current || !mountedRef.current) return;
            processingRef.current = true;

            void (async () => {
              await stopScanner(scanner);
              if (!mountedRef.current) return;
              scanMutation.mutate(decodedText, {
                onSuccess: (result) => {
                  if (!mountedRef.current) return;
                  setState({ status: 'success', result });
                  resetTimerRef.current = setTimeout(() => {
                    if (!mountedRef.current) return;
                    setState({ status: 'scanning' });
                    startScanner();
                  }, RESET_DELAY_MS);
                },
                onError: (err) => {
                  if (!mountedRef.current) return;
                  setState({ status: 'error', message: err.message });
                  resetTimerRef.current = setTimeout(() => {
                    if (!mountedRef.current) return;
                    setState({ status: 'scanning' });
                    startScanner();
                  }, RESET_DELAY_MS);
                },
              });
            })();
          },
          undefined,
        );
      } catch (err: unknown) {
        if (!mountedRef.current) return;
        const message =
          err instanceof Error ? err.message : 'Camera access denied';
        setState({ status: 'error', message });
      }
    })();
  };

  useEffect(() => {
    mountedRef.current = true;
    startScanner();
    return () => {
      mountedRef.current = false;
      if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
      if (scannerRef.current) {
        void stopScanner(scannerRef.current);
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 pt-[calc(var(--nav-height)+48px)] pb-20">
      <div className="text-center">
        <p className="text-primary mb-1 text-[0.72rem] font-bold tracking-[0.12em] uppercase">
          Staff
        </p>
        <h1 className="text-foreground text-2xl font-extrabold">Scan Entry</h1>
        <p className="text-muted-foreground mt-1 text-[0.85rem]">
          Point the camera at the customer's QR code
        </p>
      </div>

      <div className="border-border bg-secondary relative w-full overflow-hidden rounded-2xl border">
        <div
          id={QR_ELEMENT_ID}
          className={state.status !== 'scanning' ? 'invisible h-0' : ''}
        />

        {state.status === 'success' && (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <CheckCircle className="text-primary h-14 w-14" />
            <p className="text-foreground text-lg font-extrabold">
              Access granted
            </p>
            <p className="text-muted-foreground text-[0.88rem]">
              <span className="text-foreground font-semibold">
                {state.result.customerName}
              </span>
            </p>
            <p className="text-muted-foreground text-[0.8rem]">
              {state.result.kind === 'membership'
                ? 'Membership · daily entry'
                : `${state.result.remainingBalance} entr${
                    state.result.remainingBalance === 1 ? 'y' : 'ies'
                  } remaining`}
            </p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <XCircle className="text-destructive h-14 w-14" />
            <p className="text-foreground text-lg font-extrabold">
              Access denied
            </p>
            <p className="text-muted-foreground text-[0.85rem]">
              {state.message}
            </p>
          </div>
        )}
      </div>

      {state.status === 'scanning' && (
        <p className="text-muted-foreground text-center text-[0.8rem]">
          Scanning…
        </p>
      )}
      {state.status !== 'scanning' && (
        <p className="text-muted-foreground text-center text-[0.8rem]">
          Returning to scanner in {RESET_DELAY_MS / 1000} seconds…
        </p>
      )}
    </div>
  );
}
