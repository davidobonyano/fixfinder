import { useEffect, useRef, useState } from "react";

export default function Verify() {
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [selfieBlob, setSelfieBlob] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [status, setStatus] = useState("");

  const apiBase = import.meta.env.VITE_API_BASE_URL || "https://fixfinder-backend-8yjj.onrender.com";

  const getToken = () => localStorage.getItem("token") || "";

  useEffect(() => {
    // Get random prompt
    fetch(`${apiBase}/api/verify/start`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((d) => setPrompt(d.prompt || "blink"))
      .catch(() => setPrompt("blink"));

    // Init camera
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        setStatus("Camera/mic permission denied");
      }
    })();

    return () => {
      mediaStreamRef.current?.getTracks()?.forEach((t) => t.stop());
    };
  }, []);

  const captureSelfie = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.9));
    setSelfieBlob(blob);
  };

  const startRecording = () => {
    if (!mediaStreamRef.current) return;
    const chunks = [];
    const rec = new MediaRecorder(mediaStreamRef.current, { mimeType: "video/webm" });
    recorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      setVideoBlob(blob);
      setRecording(false);
    };
    setRecording(true);
    rec.start();
    // stop after ~5s
    setTimeout(() => rec.state !== "inactive" && rec.stop(), 5200);
  };

  const uploadAndEvaluate = async () => {
    try {
      setStatus("Uploading...");
      const fd = new FormData();
      if (selfieBlob) fd.append("selfiePhoto", new File([selfieBlob], "selfie.jpg", { type: "image/jpeg" }));
      if (videoBlob) fd.append("selfieVideo", new File([videoBlob], "selfie.webm", { type: "video/webm" }));

      const up = await fetch(`${apiBase}/api/verify/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      if (!up.ok) throw new Error("Upload failed");

      // Simple client score placeholder (to be replaced with face-api.js)
      const durationMs = videoBlob ? videoBlob.size / 100 : 5000; // naive placeholder
      const hasAudio = true; // MediaRecorder requested audio
      const frameCount = 30; // placeholder
      const selfieScore = 0.7; // placeholder over threshold

      const evalRes = await fetch(`${apiBase}/api/verify/auto-evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ selfieScore, videoDurationMs: durationMs, hasAudio, frameCount }),
      });
      const evalJson = await evalRes.json();
      setStatus(evalRes.ok ? `Submitted. Status: ${evalJson?.verification?.status}` : `Eval failed`);
    } catch (e) {
      setStatus("Upload/Eval error");
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-semibold mb-2">Verification</h1>
      <p className="text-sm mb-4">Prompt: <span className="font-mono">{prompt}</span></p>

      <video ref={videoRef} autoPlay playsInline className="w-full rounded border mb-3" />

      <div className="flex gap-2 mb-4">
        <button onClick={captureSelfie} className="px-3 py-2 bg-gray-800 text-white rounded">Capture Selfie</button>
        <button onClick={startRecording} disabled={recording} className="px-3 py-2 bg-blue-600 text-white rounded">
          {recording ? "Recording..." : "Record 5s Video"}
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={uploadAndEvaluate} className="px-3 py-2 bg-green-600 text-white rounded">Submit</button>
        <span className="text-sm self-center">{status}</span>
      </div>
    </div>
  );
}



