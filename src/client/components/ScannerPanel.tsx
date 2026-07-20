import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { Camera, ScanLine, X } from "lucide-preact";
import { NotFoundException } from "@zxing/library";
import { useEffect, useRef, useState } from "preact/hooks";

type Props = {
  active: boolean;
  onScan: (token: string) => void;
  onClose: () => void;
};

export default function ScannerPanel({ active, onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState("");

  useEffect(() => {
    if (!active) {
      return undefined;
    }
    let disposed = false;
    let controls: IScannerControls | undefined;
    let handled = false;

    async function start() {
      try {
        const video = videoRef.current;
        if (!video) {
          return;
        }
        setError("");
        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 180,
          delayBetweenScanSuccess: 1000,
          tryPlayVideoTimeout: 5000
        });
        controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          },
          video,
          (result, scanError, currentControls) => {
            if (result && !disposed && !handled) {
              handled = true;
              currentControls.stop();
              onScanRef.current(result.getText());
              return;
            }
            if (scanError && !(scanError instanceof NotFoundException) && !disposed) {
              setError("Nao foi possivel ler o QRCode. Ajuste a camera e tente de novo.");
            }
          }
        );
      } catch {
        if (!disposed) {
          setError("Nao foi possivel abrir a camera.");
        }
      }
    }

    void start();
    return () => {
      disposed = true;
      controls?.stop();
    };
  }, [active]);

  if (!active) {
    return null;
  }

  return (
    <section class="animate-fade fixed inset-0 z-50 h-[100dvh] w-[100dvw] overflow-hidden bg-black/92">
      <div class="animate-sheet relative flex h-full min-h-[100svh] flex-col">
        <div class="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-4 py-5 text-white">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <Camera size={18} aria-hidden="true" />
            Scanner
          </div>
          <button
            class="touch-button inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"
            type="button"
            onClick={onClose}
            aria-label="Fechar scanner"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <video ref={videoRef} class="h-full w-full bg-stone-950 object-cover" muted playsInline />
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center px-8">
          <div class="relative aspect-square w-full max-w-sm rounded-[2rem] border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]">
            <div class="absolute inset-x-6 top-0 h-1 rounded-full bg-teal-300 shadow-[0_0_22px_rgba(94,234,212,0.9)]" />
          </div>
        </div>
        <div class="absolute inset-x-0 bottom-0 z-10 px-4 pb-6">
          <div class="rounded-2xl bg-black/40 p-4 text-white backdrop-blur-md">
            <p class="flex items-center gap-2 text-sm font-semibold">
              <ScanLine size={16} aria-hidden="true" />
              Aponte a camera para o QRCode
            </p>
            {error ? <p class="mt-2 text-sm text-rose-200">{error}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
