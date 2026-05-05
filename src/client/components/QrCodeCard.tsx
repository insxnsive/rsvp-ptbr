import { Download, QrCode } from "lucide-preact";
import QRCode from "qrcode";
import { useEffect, useState } from "preact/hooks";

type Props = {
  token: string;
  guestName: string;
};

export default function QrCodeCard({ token, guestName }: Props) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(token, {
      margin: 2,
      width: 320,
      errorCorrectionLevel: "M",
      color: {
        dark: "#201a16",
        light: "#ffffff"
      }
    }).then((url) => {
      if (active) {
        setDataUrl(url);
      }
    });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <section class="soft-panel animate-pop rounded-lg p-4 text-center">
      <div class="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-teal-100 text-teal-700">
        <QrCode size={22} aria-hidden="true" />
      </div>
      <h2 class="text-lg font-semibold">QRCode de {guestName}</h2>
      <p class="mt-1 text-sm text-stone-600">Apresente este codigo na entrada do evento.</p>
      <div class="mx-auto mt-4 grid w-full max-w-xs place-items-center rounded-lg bg-white p-3 shadow-sm">
        {dataUrl ? (
          <img src={dataUrl} alt={`QRCode de ${guestName}`} class="aspect-square w-full rounded-md" />
        ) : (
          <div class="aspect-square w-full animate-pulse rounded-md bg-stone-100" />
        )}
      </div>
      {dataUrl ? (
        <a
          class="touch-button mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
          href={dataUrl}
          download={`qrcode-${guestName.toLowerCase().replace(/\s+/g, "-")}.png`}
        >
          <Download size={18} aria-hidden="true" />
          Salvar PNG
        </a>
      ) : null}
    </section>
  );
}
