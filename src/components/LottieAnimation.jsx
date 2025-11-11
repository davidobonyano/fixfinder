import { useEffect, useRef } from 'react';

function normalizeHex(color) {
  if (!color) return '';
  const c = color.trim().toLowerCase();
  if (c.startsWith('#')) return c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c;
  if (c.startsWith('rgb')) {
    const m = c.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (!m) return c;
    const toHex = (n) => {
      const h = Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, '0');
      return h;
    };
    return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
  }
  return c;
}

function isWhiteColor(c) {
  const hex = normalizeHex(c);
  return hex === '#ffffff' || hex === '#fff';
}

function stripBackgroundLayers(anim) {
  if (!anim || typeof anim !== 'object') return anim;
  const clone = JSON.parse(JSON.stringify(anim));

  const compWidth = clone.w;
  const compHeight = clone.h;

  const maybeRemoveLayer = (layer) => {
    if (!layer) return false;
    // Solid layer: ty 1, sc color, sw/sh size
    if (layer.ty === 1) {
      if (isWhiteColor(layer.sc) && layer.sw === compWidth && layer.sh === compHeight) {
        return true;
      }
    }
    // Shape layer: ty 4, look for a rectangle path covering comp with white fill
    if (layer.ty === 4 && Array.isArray(layer.shapes)) {
      let hasWhiteFill = false;
      let hasFullRect = false;
      layer.shapes.forEach((sh) => {
        // Fill: ty 'fl', c.k could be [r,g,b, a]
        if (sh.ty === 'fl' && sh.c && Array.isArray(sh.c.k)) {
          const [r, g, b, a] = sh.c.k;
          const rgbaWhite = r === 1 && g === 1 && b === 1 && (a === undefined || a === 1);
          if (rgbaWhite) hasWhiteFill = true;
        }
        // Rect: ty 'rc', s.k is [w,h]
        if (sh.ty === 'rc' && sh.s && Array.isArray(sh.s.k)) {
          const [w, h] = sh.s.k;
          if (Math.round(w) >= compWidth && Math.round(h) >= compHeight) hasFullRect = true;
        }
      });
      if (hasWhiteFill && hasFullRect) {
        return true;
      }
    }
    return false;
  };

  if (Array.isArray(clone.layers)) {
    clone.layers = clone.layers.filter((l) => !maybeRemoveLayer(l));
  }

  // Also strip in nested assets/precomps if present
  if (Array.isArray(clone.assets)) {
    clone.assets.forEach((asset) => {
      if (Array.isArray(asset.layers)) {
        asset.layers = asset.layers.filter((l) => !maybeRemoveLayer(l));
      }
    });
  }

  return clone;
}

export default function LottieAnimation({ animationData, loop = true, autoplay = true, className = '' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    let animationInstance = null;
    let isCancelled = false;

    (async () => {
      const lottie = (await import('lottie-web')).default;
      if (isCancelled || !containerRef.current) return;
      const cleaned = stripBackgroundLayers(animationData);
      animationInstance = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop,
        autoplay,
        animationData: cleaned,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet',
        },
      });

      // Ensure transparent background for SVG renderer
      animationInstance.addEventListener('DOMLoaded', () => {
        if (!containerRef.current) return;
        const svg = containerRef.current.querySelector('svg');
        if (svg) {
          svg.style.background = 'transparent';
          svg.style.isolation = 'isolate';
        }
        // Attempt to clear full-size white rect backgrounds in some exports
        const rects = containerRef.current.querySelectorAll('rect');
        rects.forEach((rect) => {
          const fill = rect.getAttribute('fill')?.toLowerCase();
          if (fill === '#ffffff' || fill === 'white' || fill === 'rgb(255,255,255)') {
            rect.setAttribute('fill', 'transparent');
          }
        });
      });
    })();

    return () => {
      isCancelled = true;
      if (animationInstance) {
        animationInstance.destroy();
      }
    };
  }, [animationData, loop, autoplay]);

  return (
    <div ref={containerRef} className={className} />
  );
}


