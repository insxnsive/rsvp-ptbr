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
  const sectionRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  onScanRef.current = onScan;
  onCloseRef.current = onClose;
  const [error, setError] = useState("");

  useEffect(() => {
    if (!active) return undefined;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sectionRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key === "Tab" && sectionRef.current) {
        const focusable = sectionRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [active]);

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
        const nextControls = await reader.decodeFromConstraints(
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
        if (disposed) {
          nextControls.stop();
          return;
        }
        controls = nextControls;
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
    <section
      ref={sectionRef}
      class="animate-fade fixed inset-0 z-50 h-[100dvh] w-[100dvw] overflow-hidden bg-black/92"
      role="dialog"
      aria-modal="true"
      aria-label="Scanner QR"
      tabindex={-1}
    >
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
