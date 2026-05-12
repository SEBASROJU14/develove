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
}

export default function CameraView({ event, userId, photosTaken: initial }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [photosLeft, setPhotosLeft] = useState(
    event.max_photos_per_person - initial
  );
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [taking, setTaking] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [justTook, setJustTook] = useState(false);

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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(false);
    } catch {
      setCameraError(true);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  async function takePhoto() {
    if (!videoRef.current || !canvasRef.current || taking || photosLeft <= 0)
      return;
    setTaking(true);
    setFlashing(true);
    setTimeout(() => setFlashing(false), 250);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setTaking(false);
          return;
        }

        const supabase = createClient();
        const photoId = crypto.randomUUID();
        const path = `${event.id}/${photoId}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("event-photos")
          .upload(path, blob, { contentType: "image/jpeg" });

        if (uploadError) {
          setTaking(false);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("event-photos").getPublicUrl(path);

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
        setJustTook(true);
        setTimeout(() => setJustTook(false), 1000);
        setTaking(false);
      },
      "image/jpeg",
      0.88
    );
  }

  function flipCamera() {
    setFacingMode((m) => (m === "environment" ? "user" : "environment"));
  }

  if (cameraError) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-white text-lg font-medium">Sin acceso a la cámara</p>
        <p className="text-sm" style={{ color: "#888" }}>
          Permite el acceso en la configuración de tu navegador
        </p>
        <Link href="/dashboard" className="mt-4 text-sm underline text-white">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black select-none">
      {/* Video viewfinder */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Flash overlay */}
      {flashing && (
        <div className="absolute inset-0 bg-white pointer-events-none animate-flash" />
      )}

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-12 pb-4"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)" }}>
        <Link href="/dashboard" className="flex items-center gap-1.5 text-white text-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="text-center">
          <p className="text-white text-sm font-medium">{event.name}</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
            revelado {formatDate(event.reveal_date)}
          </p>
        </div>

        {/* Film counter */}
        <div className="flex items-center gap-1.5">
          <FilmIcon />
          <span
            className="font-mono text-sm font-bold"
            style={{ color: justTook ? "#e8b4b8" : "white" }}
          >
            {photosLeft}
          </span>
        </div>
      </div>

      {/* Bottom controls */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8"
        style={{
          paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
          paddingTop: "1.5rem",
          background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)",
        }}
      >
        {/* Flip camera */}
        <button
          onClick={flipCamera}
          disabled={taking}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          <FlipIcon />
        </button>

        {/* Shutter */}
        <button
          onClick={takePhoto}
          disabled={taking || photosLeft <= 0}
          className="relative flex items-center justify-center rounded-full transition-transform active:scale-90"
          style={{
            width: 76,
            height: 76,
            background: photosLeft <= 0 ? "#444" : "white",
            boxShadow: "0 0 0 5px rgba(255,255,255,0.25)",
          }}
        >
          {taking && (
            <div className="absolute inset-0 rounded-full" style={{ background: "rgba(0,0,0,0.2)" }} />
          )}
          {photosLeft <= 0 && (
            <span className="text-xs font-medium text-white">Lleno</span>
          )}
        </button>

        {/* Placeholder for balance */}
        <div className="w-11" />
      </div>
    </div>
  );
}

function FilmIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
      <line x1="7" y1="2" x2="7" y2="22"/>
      <line x1="17" y1="2" x2="17" y2="22"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <line x1="2" y1="7" x2="7" y2="7"/>
      <line x1="2" y1="17" x2="7" y2="17"/>
      <line x1="17" y1="17" x2="22" y2="17"/>
      <line x1="17" y1="7" x2="22" y2="7"/>
    </svg>
  );
}

function FlipIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v6h6"/>
      <path d="M23 20v-6h-6"/>
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
    </svg>
  );
}
