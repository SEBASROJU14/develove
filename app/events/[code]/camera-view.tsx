"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { Event } from "@/types/database";

interface Props {
  event: Event;
  userId: string;
  photosTaken: number;
  onBack?: () => void;
  onPhotoTaken?: () => void;
}

type CameraError = "permission" | "not-found" | "other";

export default function CameraView({
  event,
  userId,
  photosTaken: initial,
  onBack,
  onPhotoTaken,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [photosLeft, setPhotosLeft] = useState(event.max_photos_per_person - initial);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [taking, setTaking] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [justTook, setJustTook] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(true);
  const [zoom, setZoom] = useState<"0.5" | "1">("1");
  const [supportsZoom, setSupportsZoom] = useState(false);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    function compute() {
      const diff = new Date(event.reveal_date).getTime() - Date.now();
      if (diff <= 0) { setCountdown(""); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (d > 0) setCountdown(`${d}d ${h}h`);
      else if (h > 0) setCountdown(`${h}h ${m}m`);
      else setCountdown(`${m}m`);
    }
    compute();
    const id = setInterval(compute, 60000);
    return () => clearInterval(id);
  }, [event.reveal_date]);

  async function activateTorch() {
    if (!flashEnabled) return;
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
    if (!caps.torch) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] });
      setTimeout(async () => {
        try { await track.applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] }); } catch {}
      }, 150);
    } catch {}
  }

  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraError(null);
      const track = stream.getVideoTracks()[0];
      const caps = (track.getCapabilities?.() ?? {}) as any;
      setSupportsZoom(!!caps.zoom);
      setZoom("1");
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraError("permission");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setCameraError("not-found");
        } else {
          setCameraError("other");
        }
      } else {
        setCameraError("other");
      }
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  async function takePhoto() {
    if (!videoRef.current || !canvasRef.current || taking || photosLeft <= 0) return;
    setTaking(true);
    setFlashing(true);
    activateTorch();
    setTimeout(() => setFlashing(false), 250);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);

    canvas.toBlob(
      async (blob) => {
        if (!blob) { setTaking(false); return; }

        const supabase = createClient();
        const photoId = crypto.randomUUID();
        const path = `${event.id}/${photoId}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("event-photos")
          .upload(path, blob, { contentType: "image/jpeg" });

        if (uploadError) { setTaking(false); return; }

        const { data: { publicUrl } } = supabase.storage
          .from("event-photos")
          .getPublicUrl(path);

        await supabase.from("photos").insert({
          id: photoId,
          event_id: event.id,
          user_id: userId,
          storage_url: publicUrl,
          is_revealed: false,
        });

        await supabase.rpc("increment_photos_taken", {
          p_event_id: event.id,
          p_user_id: userId,
        });

        setPhotosLeft((n) => n - 1);
        onPhotoTaken?.();
        setJustTook(true);
        setTimeout(() => setJustTook(false), 1000);
        setTaking(false);
      },
      "image/jpeg",
      0.88
    );
  }

  function handleBack() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onBack?.();
  }

  async function applyZoom(value: "0.5" | "1") {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: parseFloat(value) } as any] });
    } catch {}
    setZoom(value);
  }

  if (cameraError) {
    return <CameraErrorScreen type={cameraError} onBack={onBack} />;
  }

  const BackBtn = onBack ? (
    <button onClick={handleBack} className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={ctrlStyle}>
      <BackArrow />
    </button>
  ) : (
    <Link href="/dashboard" className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={ctrlStyle}>
      <BackArrow />
    </Link>
  );

  return (
    <div className="fixed inset-0 select-none overflow-hidden">
      {/* Fullscreen video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={facingMode === "user" ? { transform: "scaleX(-1)" } : undefined}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Flash overlay */}
      {flashing && (
        <div className="absolute inset-0 bg-white pointer-events-none animate-flash z-10" />
      )}

      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pb-8"
        style={{
          paddingTop: "max(2.5rem, env(safe-area-inset-top))",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)",
        }}
      >
        {BackBtn}

        <div className="text-center">
          <p className="text-white text-sm font-medium font-playfair leading-tight">
            {event.name}
          </p>
          {countdown ? (
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
              revela en {countdown}
            </p>
          ) : null}
        </div>

        {/* Contador de fotos */}
        <div
          className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold"
          style={{
            ...ctrlStyle,
            color: justTook ? "#e8b4b8" : "white",
            minWidth: 52,
            textAlign: "center",
          }}
        >
          {photosLeft > 0 ? `${photosLeft} foto${photosLeft !== 1 ? "s" : ""}` : "Lleno"}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)",
          paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))",
        }}
      >
        {/* Zoom selector — solo si el dispositivo soporta zoom */}
        {supportsZoom && (
          <div className="flex justify-center mb-5">
            <div
              className="flex gap-0.5 rounded-full p-1"
              style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
            >
              {(["0.5", "1"] as const).map((z) => (
                <button
                  key={z}
                  onClick={() => applyZoom(z)}
                  className="rounded-full text-xs font-semibold px-3 py-1 transition-all"
                  style={{
                    background: zoom === z ? "rgba(255,255,255,0.22)" : "transparent",
                    color: zoom === z ? "white" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {z}×
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Controles */}
        <div className="flex items-center justify-between px-10">
          {/* Flash */}
          <button
            onClick={() => setFlashEnabled((f) => !f)}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
            style={{
              ...ctrlStyle,
              color: flashEnabled ? "#ffd60a" : "rgba(255,255,255,0.35)",
            }}
          >
            <FlashIcon />
          </button>

          {/* Disparador */}
          <button
            onClick={takePhoto}
            disabled={taking || photosLeft <= 0}
            className="relative flex items-center justify-center rounded-full transition-transform active:scale-90"
            style={{
              width: 80,
              height: 80,
              background: photosLeft <= 0 ? "rgba(255,255,255,0.2)" : "white",
              boxShadow: "0 0 0 5px rgba(255,255,255,0.25)",
            }}
          >
            {taking && (
              <div className="absolute inset-0 rounded-full" style={{ background: "rgba(0,0,0,0.22)" }} />
            )}
            {photosLeft <= 0 && (
              <span className="text-xs font-medium" style={{ color: "#888" }}>Lleno</span>
            )}
          </button>

          {/* Flip */}
          <button
            onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
            disabled={taking}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
            style={ctrlStyle}
          >
            <FlipIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

const ctrlStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
};

// ── Pantalla de error ────────────────────────────────────────────────────────

type Browser = "chrome" | "safari-ios" | "safari-mac" | "firefox" | "edge" | "other";

function detectBrowser(): Browser {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (ua.includes("Edg/")) return "edge";
  if (ua.includes("Chrome/")) return "chrome";
  if (ua.includes("Firefox/")) return "firefox";
  if (ua.includes("Safari/")) return /iPad|iPhone|iPod/.test(ua) ? "safari-ios" : "safari-mac";
  return "other";
}

const PERMISSION_STEPS: Record<Browser, { title: string; steps: string[] }> = {
  chrome: {
    title: "Cámara bloqueada en Chrome",
    steps: [
      "Toca el ícono 🔒 o ⓘ en la barra de direcciones",
      'Selecciona "Permisos del sitio"',
      'Cambia "Cámara" a Permitir',
      "Recarga la página",
    ],
  },
  edge: {
    title: "Cámara bloqueada en Edge",
    steps: [
      "Toca el ícono 🔒 en la barra de direcciones",
      'Selecciona "Permisos para este sitio"',
      'Cambia "Cámara" a Permitir',
      "Recarga la página",
    ],
  },
  "safari-ios": {
    title: "Cámara bloqueada en Safari",
    steps: [
      "Abre Configuración del iPhone/iPad",
      "Baja hasta Safari → Cámara",
      'Selecciona "Permitir"',
      "Vuelve a Safari y recarga la página",
    ],
  },
  "safari-mac": {
    title: "Cámara bloqueada en Safari",
    steps: [
      "En la barra de menú ve a Safari → Configuración",
      'Abre la pestaña "Sitios web"',
      'En "Cámara", cambia este sitio a Permitir',
      "Recarga la página",
    ],
  },
  firefox: {
    title: "Cámara bloqueada en Firefox",
    steps: [
      "Toca el ícono de cámara en la barra de direcciones",
      'Selecciona "Eliminar bloqueo"',
      "Recarga la página",
    ],
  },
  other: {
    title: "Sin acceso a la cámara",
    steps: [
      "Busca el ícono de cámara o 🔒 en la barra de direcciones",
      "Activa el permiso de cámara para este sitio",
      "Recarga la página",
    ],
  },
};

function CameraErrorScreen({
  type,
  onBack,
}: {
  type: CameraError;
  onBack?: () => void;
}) {
  const info = type === "permission" ? PERMISSION_STEPS[detectBrowser()] : null;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-6" style={{ background: "#0F0F0F" }}>
      <div className="max-w-xs w-full space-y-6">
        <p className="text-3xl text-center">📷</p>

        <p className="text-white text-lg font-semibold text-center">
          {type === "not-found"
            ? "No se encontró cámara"
            : info?.title ?? "Error al acceder a la cámara"}
        </p>

        {type === "not-found" ? (
          <p className="text-sm text-center" style={{ color: "#888" }}>
            Este dispositivo no tiene cámara disponible.
          </p>
        ) : info ? (
          <ol className="space-y-3">
            {info.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "#ccc" }}>
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                  style={{ background: "rgba(255,255,255,0.13)", color: "white" }}
                >
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-center" style={{ color: "#888" }}>
            Algo salió mal al acceder a la cámara.
          </p>
        )}

        <div className="text-center pt-2">
          {onBack ? (
            <button onClick={onBack} className="text-sm underline" style={{ color: "#888" }}>
              Volver al evento
            </button>
          ) : (
            <Link href="/dashboard" className="text-sm underline" style={{ color: "#888" }}>
              Volver
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Iconos ───────────────────────────────────────────────────────────────────

function BackArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function FlashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L4.09 12.96A1 1 0 0 0 5 14.5h5.5L11 22l8.91-10.96A1 1 0 0 0 19 9.5h-5.5L13 2z" />
    </svg>
  );
}

function FlipIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v6h6" />
      <path d="M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
    </svg>
  );
}
