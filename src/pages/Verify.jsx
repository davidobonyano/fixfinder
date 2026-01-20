import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import { FaArrowLeft, FaCamera, FaCheckCircle, FaInfoCircle, FaShieldAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import {
  getFaceVerificationStatus,
  startFaceVerification,
  submitFaceCapture,
  getUserProfile,
  getProfessional,
  setFaceReference,
} from "../utils/api";

const MODEL_BASE_URL = import.meta.env.VITE_FACE_MODEL_URL || "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
const FACE_MODEL_VERSION = "face-api.js@1";

const statusColor = {
  verified: "text-emerald-600",
  in_progress: "text-amber-600",
  failed: "text-red-600",
  not_started: "text-gray-500",
  reference_set: "text-indigo-600",
};

export default function Verify() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const { user, isLoading: authLoading, setUser } = useAuth();
  const navigate = useNavigate();

  const [modelsReady, setModelsReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [statusPayload, setStatusPayload] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [captureState, setCaptureState] = useState("idle");
  const [detectionScore, setDetectionScore] = useState(null);
  const [facePreview, setFacePreview] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [startingSession, setStartingSession] = useState(false);
  const [referenceOptions, setReferenceOptions] = useState([]);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [settingReferenceId, setSettingReferenceId] = useState(null);
  const [referenceError, setReferenceError] = useState("");

  const faceVerification = statusPayload?.faceVerification || user?.faceVerification;
  const emailVerification = statusPayload?.emailVerification || user?.emailVerification;
  const faceStatus = faceVerification?.status || "not_started";
  const emailVerified = Boolean(emailVerification?.isVerified);
  const faceVerified = faceStatus === "verified";
  const showVerifiedBadge = emailVerified && faceVerified;
  const referenceSet = Boolean(faceVerification?.referenceImageUrl);
  const authUserId = user?._id || user?.id;

  const readiness = useMemo(() => {
    if (!modelsReady) return "Loading AI models…";
    if (!cameraReady) return "Waiting for camera permissions…";
    return "Camera live — ready to verify";
  }, [modelsReady, cameraReady]);

  const faceStatusLabel = useMemo(() => {
    switch (faceStatus) {
      case "verified":
        return "Verified";
      case "reference_set":
        return "Reference ready";
      case "in_progress":
        return "In progress";
      case "failed":
        return "Face mismatch";
      default:
        return "Not verified";
    }
  }, [faceStatus]);

  const fetchStatus = useCallback(async () => {
    try {
      const payload = await getFaceVerificationStatus();
      setStatusPayload(payload);
      if (payload.faceVerification?.status === "verified") {
        setCaptureState("verified");
      }
    } catch (err) {
      setError(err.message || "Unable to load verification status right now.");
    }
  }, []);

  const loadReferenceOptions = useCallback(async () => {
    if (!authUserId) return;
    setReferenceError("");
    setReferenceLoading(true);
    try {
      const profileResponse = await getUserProfile();
      if (!profileResponse?.success || !profileResponse.data) {
        throw new Error(profileResponse?.message || "Unable to load profile");
      }
      const profile = profileResponse.data;
      const options = [];
      const profileImage = profile.profilePicture || profile.avatarUrl;
      if (profileImage) {
        options.push({
          id: "profile-picture",
          url: profileImage,
          label: "Profile picture",
          sourceType: "profile_picture",
        });
      }
      let proData = null;
      if (authUserId) {
        try {
          const professionalResponse = await getProfessional(profile._id, { byUser: true });
          if (professionalResponse?.success) {
            proData = professionalResponse.data;
          }
        } catch (err) {
          console.log("No professional profile found while loading reference options", err?.message || err);
        }
      }
      const photos = proData?.photos || [];
      photos.forEach((url, index) => {
        if (!url) return;
        const meta = proData?.photosMeta?.[index];
        options.push({
          id: meta?.publicId || `portfolio-${index}`,
          url,
          label: meta?.label || meta?.name || `Portfolio photo ${index + 1}`,
          sourceType: "portfolio",
        });
      });
      setReferenceOptions(options);
    } catch (err) {
      console.error("Reference options error:", err);
      setReferenceError(err.message || "Unable to load reference photos right now.");
    } finally {
      setReferenceLoading(false);
    }
  }, [authUserId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login?next=/dashboard/professional/verify-face", { replace: true });
      return;
    }
    if (user.role !== "professional") {
      navigate("/dashboard", { replace: true });
      return;
    }
    fetchStatus();
  }, [authLoading, user, navigate, fetchStatus]);

  useEffect(() => {
    if (!authUserId) return;
    loadReferenceOptions();
  }, [authUserId, loadReferenceOptions]);

  useEffect(() => {
    let cancelled = false;
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_BASE_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_BASE_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_BASE_URL),
        ]);
        if (!cancelled) setModelsReady(true);
      } catch (err) {
        console.error("Failed to load face-api models", err);
        if (!cancelled) setError("Unable to load face detection models. Please check your internet connection and try again.");
      }
    };
    loadModels();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 720 }, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => { });
        }
        setCameraReady(true);
      } catch (err) {
        console.error("Camera error", err);
        setError("Camera access was blocked. Please allow camera permissions and refresh the page.");
      }
    };
    initCamera();
    return () => {
      streamRef.current?.getTracks()?.forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!facePreview) return;
    return () => {
      URL.revokeObjectURL(facePreview);
    };
  }, [facePreview]);

  const beginFaceSession = async () => {
    if (!modelsReady || !cameraReady || faceVerified) {
      return;
    }

    if (!referenceSet) {
      setError("Select a reference photo first.");
      return;
    }

    setError("");
    setInfo("");
    setStartingSession(true);
    try {
      const response = await startFaceVerification();
      setPrompt(response.prompt || "Look straight at the camera and blink twice.");
      setStatusPayload((prev) => ({ ...(prev || {}), faceVerification: response.faceVerification }));
      setCaptureState("primed");
      setInfo("Session started. Follow the prompt and submit a clear frame.");
    } catch (err) {
      setError(err.message || "Unable to start face verification right now.");
    } finally {
      setStartingSession(false);
    }
  };

  const handleReferenceSelection = async (option) => {
    if (!modelsReady) {
      setError("Models are still loading. Please wait before setting a reference.");
      return;
    }

    setError("");
    setInfo("Analyzing selected photo…");
    setSettingReferenceId(option.id);
    try {
      // Load image with CORS support
      const img = new Image();
      img.crossOrigin = "anonymous";

      const imageElement = await new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = (err) => {
          console.error("Image load error:", err);
          reject(new Error("Failed to load image. Please check if the image URL is accessible."));
        };
        img.src = option.url;
      });

      // Try with lower threshold first, then fallback to even lower
      let detection = await faceapi
        .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      // If no detection, try with even lower threshold
      if (!detection) {
        detection = await faceapi
          .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.2 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
      }

      // If still no detection, try SsdMobilenetv1 as fallback
      if (!detection) {
        try {
          await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_BASE_URL);
          detection = await faceapi
            .detectSingleFace(imageElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
            .withFaceLandmarks()
            .withFaceDescriptor();
        } catch (ssdErr) {
          console.warn("SSD model not available, using TinyFaceDetector only");
        }
      }

      if (!detection) {
        throw new Error(
          "We couldn't detect a face in that photo. Please choose a clear photo with a visible face, good lighting, and no obstructions (glasses, masks, etc.)."
        );
      }

      const descriptor = Array.from(detection.descriptor);
      const response = await setFaceReference({
        imageUrl: option.url,
        descriptor,
        sourceType: option.sourceType,
        assetId: option.id,
        label: option.label,
      });

      if (response?.faceVerification) {
        setStatusPayload((prev) => ({
          ...(prev || {}),
          faceVerification: response.faceVerification,
        }));
      }
      if (response?.user) {
        setUser?.(response.user);
      }
      setInfo("Reference photo saved. You can now start the live check.");
    } catch (err) {
      console.error("Reference selection error", err);
      setError(err.message || "Unable to use that photo. Please try another image.");
    } finally {
      setSettingReferenceId(null);
    }
  };

  const captureAndSubmit = async () => {
    if (!modelsReady || !cameraReady || faceVerified) return;
    if (!videoRef.current) return;
    if (!referenceSet) {
      setError("Select a reference photo before capturing.");
      return;
    }

    setError("");
    setInfo("Analyzing your face…");
    setCaptureState("capturing");

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setCaptureState("primed");
        setInfo("");
        setError("We couldn’t detect your face. Please adjust your lighting, center your face, and try again.");
        return;
      }

      const descriptor = Array.from(detection.descriptor);
      setDetectionScore(Number(detection.detection.score.toFixed(3)));

      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error("Unable to capture frame"));
          },
          "image/jpeg",
          0.92
        );
      });

      setFacePreview(URL.createObjectURL(blob));
      setCaptureState("uploading");
      setInfo("Uploading encrypted face vector…");

      const formData = new FormData();
      formData.append("faceDescriptor", JSON.stringify(descriptor));
      formData.append("detectionScore", detection.detection.score.toString());
      formData.append("modelVersion", FACE_MODEL_VERSION);
      if (prompt) formData.append("prompt", prompt);
      formData.append("faceImage", new File([blob], "face-capture.jpg", { type: "image/jpeg" }));

      const response = await submitFaceCapture(formData);
      setStatusPayload((prev) => ({ ...(prev || {}), faceVerification: response.faceVerification }));
      setCaptureState("verified");
      setInfo("Face verification complete — you can return to your dashboard.");

      if (response.user) {
        setUser?.(response.user);
      } else {
        const refreshed = await getUserProfile();
        if (refreshed?.data) {
          setUser?.(refreshed.data);
        }
      }
    } catch (err) {
      console.error("Face capture error", err);
      setError(err.message || "Unable to submit your capture right now. Please try again.");
      setCaptureState("primed");
      setInfo("");
    }
  };

  const stepItems = [
    { id: 1, label: "Create a FYF Pro account", completed: Boolean(user) },
    { id: 2, label: "Verify your email address", completed: emailVerified },
    { id: 3, label: "Scan face inside Pro Dashboard", completed: faceVerified },
    { id: 4, label: "Earn the Verified Pro badge", completed: showVerifiedBadge },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 lg:px-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <FaArrowLeft className="w-4 h-4" />
        Back to dashboard
      </button>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <p className="uppercase text-xs tracking-wide text-indigo-500 font-semibold">Pro Identity</p>
          <h1 className="text-3xl font-bold text-slate-900">Face Verification</h1>
          <p className="text-slate-600 mt-2">
            FYF uses face-api.js to capture an encrypted face descriptor after you verify your email. Complete both steps to
            unlock the Verified Pro badge and rank higher in search results.
          </p>
        </div>
        {showVerifiedBadge && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
            <FaShieldAlt className="w-4 h-4" />
            Verified Pro
          </div>
        )}
      </div>

      {(error || info) && (
        <div className="mb-6 space-y-3">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700">
              <FaInfoCircle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          {info && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-700">
              <FaInfoCircle className="w-5 h-5" />
              <p className="text-sm">{info}</p>
            </div>
          )}
        </div>
      )}

      {!referenceSet && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <FaInfoCircle className="w-5 h-5 flex-shrink-0" />
          <p>
            Choose one of your existing profile or portfolio photos as the reference below before starting the live check.
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.3fr,0.7fr]">
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Live camera</p>
              <p className="text-sm font-medium text-slate-600">{readiness}</p>
            </div>
            <div className="text-xs text-slate-500">
              Model source: <span className="font-mono text-slate-700">{MODEL_BASE_URL}</span>
            </div>
          </div>
          <div className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-950/5 aspect-video mb-4">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover bg-slate-900/5" />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <p className="text-sm text-slate-600">Requesting camera access…</p>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={beginFaceSession}
              disabled={!modelsReady || !cameraReady || faceVerified || startingSession || !referenceSet}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {startingSession ? (
                <span>Preparing session…</span>
              ) : (
                <>
                  <FaShieldAlt className="w-4 h-4" />
                  Start live check
                </>
              )}
            </button>
            <button
              onClick={captureAndSubmit}
              disabled={
                !modelsReady ||
                !cameraReady ||
                captureState === "uploading" ||
                (!faceVerified && captureState === "idle") ||
                !referenceSet
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FaCamera className="w-4 h-4" />
              {faceVerified ? "Capture complete" : captureState === "uploading" ? "Submitting…" : "Capture & Submit"}
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Prompt</p>
            <p className="font-mono text-slate-800">{prompt || "Tap “Start live check” to receive an action prompt."}</p>
          </div>

          {facePreview && (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 flex flex-col sm:flex-row gap-4">
              <img src={facePreview} alt="Face capture preview" className="w-full sm:w-48 rounded-xl object-cover border border-white shadow-sm" />
              <div className="text-sm text-emerald-700 space-y-1">
                <p className="font-semibold">Latest capture submitted</p>
                {detectionScore && <p>Detection confidence: {detectionScore}</p>}
                {faceVerification?.verifiedAt && (
                  <p>Verified at: {new Date(faceVerification.verifiedAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-4">Verification status</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Email verification</p>
                  <p className={`text-lg font-semibold ${emailVerified ? "text-emerald-600" : "text-amber-600"}`}>
                    {emailVerified ? "Verified" : "Pending"}
                  </p>
                </div>
                {emailVerified && <FaCheckCircle className="text-emerald-500" />}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Face verification</p>
                  <p className={`text-lg font-semibold ${statusColor[faceStatus] || "text-slate-600"}`}>
                    {faceStatusLabel}
                  </p>
                </div>
                {faceStatus === "verified" && <FaCheckCircle className="text-emerald-500" />}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <FaInfoCircle className="w-4 h-4" />
                {faceVerification?.modelVersion ? `Stored face model: ${faceVerification.modelVersion}` : "Model version stored once verification succeeds."}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-4">How it works</p>
            <ol className="space-y-3 text-sm text-slate-600">
              {stepItems.map((step) => (
                <li key={step.id} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${step.completed ? "bg-emerald-500 text-white border-emerald-500" : "border-slate-300 text-slate-500"
                      }`}
                  >
                    {step.completed ? <FaCheckCircle className="w-4 h-4" /> : step.id}
                  </span>
                  <span className={step.completed ? "text-slate-800 font-medium" : ""}>{step.label}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Reference photo</p>
                <p className="text-sm text-slate-600">Match your live capture to one of your existing photos.</p>
              </div>
              {referenceSet && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">Ready</span>
              )}
            </div>

            {referenceError && (
              <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                {referenceError}
              </div>
            )}

            {referenceSet && (
              <div className="flex items-center gap-3 mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                <img
                  src={faceVerification?.referenceImageUrl}
                  alt="Reference"
                  className="w-16 h-16 rounded-xl object-cover border border-white shadow-sm"
                />
                <div className="text-sm text-emerald-700 space-y-0.5">
                  <p className="font-semibold">{faceVerification?.referenceSource?.label || "Selected photo"}</p>
                  <p className="text-xs uppercase tracking-wide">
                    {(faceVerification?.referenceSource?.sourceType || "profile picture").replace("_", " ")}
                  </p>
                  <p className="text-xs text-emerald-600">Live captures must match this photo to pass.</p>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {referenceLoading ? (
                <p className="text-sm text-slate-500 col-span-2">Loading your photos…</p>
              ) : referenceOptions.length === 0 ? (
                <p className="text-sm text-slate-500 col-span-2">
                  Upload a profile picture or portfolio photo first, then return to set it as your reference.
                </p>
              ) : (
                referenceOptions.map((option) => {
                  const isActive = faceVerification?.referenceImageUrl === option.url;
                  const isLoading = settingReferenceId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleReferenceSelection(option)}
                      disabled={isLoading}
                      className={`relative flex flex-col gap-2 rounded-2xl border p-3 text-left transition ${isActive
                        ? "border-emerald-500 bg-emerald-50/60"
                        : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                        }`}
                    >
                      <img src={option.url} alt={option.label} className="w-full h-28 object-cover rounded-xl" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{option.label}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          {option.sourceType.replace("_", " ")}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        {isActive ? (
                          <span className="text-emerald-600 font-semibold">Active reference</span>
                        ) : isLoading ? (
                          <span>Setting…</span>
                        ) : (
                          <span>Use this photo</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-indigo-600 rounded-3xl text-white p-6 space-y-4">
            <div>
              <p className="text-sm uppercase tracking-wide opacity-80">Pro tips</p>
              <h3 className="text-xl font-semibold mt-1">Pass checks on the first try</h3>
            </div>
            <ul className="space-y-2 text-sm opacity-90">
              <li>• Use bright, even lighting without shadows.</li>
              <li>• Remove hats, masks, or tinted glasses.</li>
              <li>• Hold your phone at eye level and keep your face centered.</li>
              <li>• Follow the onscreen prompt exactly (blink, turn, or smile).</li>
            </ul>
            {faceVerified && (
              <button
                onClick={() => navigate("/dashboard/professional/profile")}
                className="w-full px-4 py-2 rounded-xl bg-white/10 backdrop-blur text-white font-semibold hover:bg-white/20"
              >
                Go to profile
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}