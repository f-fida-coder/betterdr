import { useState, useEffect } from 'react';

/**
 * Phase 3A: Optimized image component with WebP support and lazy loading.
 * 
 * Features:
 * - WebP format for modern browsers (30-40% smaller than JPEG/PNG)
 * - Responsive srcset (200w, 400w, 800w, 1600w)
 * - Lazy loading via IntersectionObserver
 * - Blur-up placeholder while loading
 * - Automatic fallback to JPEG for unsupported browsers
 * 
 * Usage:
 * <ImageOptimized 
 *   src="team-photo.jpg"
 *   alt="Team photo"
 *   className="team-image"
 * />
 * 
 * Requirements:
 * - Images must be pre-optimized with cwebp and ImageMagick
 * - Variants: image-200w.webp, image-400w.webp, etc.
 * - Fallback JPEG variants: image-200w.jpg, image-400w.jpg, etc.
 */
export default function ImageOptimized({
  src,
  alt = '',
  className = '',
  placeholderBlur = true,
  width,
  height,
  sizes = '100vw'
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [ref, setRef] = useState(null);

  // Lazy load image on intersection with viewport
  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.unobserve(entry.target);
      }
    }, {
      rootMargin: '50px' // Start loading 50px before entering viewport
    });

    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref]);

  // Generate responsive image URLs
  const srcBase = src.replace(/\.[^.]+$/, ''); // Remove extension
  
  // WebP variant URLs
  const srcSetWebP = `
    ${srcBase}-200w.webp 200w,
    ${srcBase}-400w.webp 400w,
    ${srcBase}-800w.webp 800w,
    ${srcBase}-1600w.webp 1600w
  `.trim();

  // JPEG fallback variant URLs
  const srcSetJpeg = `
    ${srcBase}-200w.jpg 200w,
    ${srcBase}-400w.jpg 400w,
    ${srcBase}-800w.jpg 800w,
    ${srcBase}-1600w.jpg 1600w
  `.trim();

  // Default src for critical images (loaded immediately)
  const defaultSrc = `${srcBase}-400w.jpg`;

  return (
    <picture
      ref={setRef}
      style={{ display: 'contents' }}
    >
      {/* WebP format (30-40% smaller) - modern browsers */}
      {isInView && (
        <source
          srcSet={srcSetWebP}
          type="image/webp"
          sizes={sizes}
        />
      )}

      {/* JPEG fallback - older browsers */}
      {isInView && (
        <source
          srcSet={srcSetJpeg}
          type="image/jpeg"
          sizes={sizes}
        />
      )}

      {/* Fallback img tag */}
      <img
        src={isInView ? defaultSrc : ''}
        alt={alt}
        width={width}
        height={height}
        className={`
          ${className}
          ${placeholderBlur && !isLoaded ? 'blur-placeholder' : ''}
        `.trim()}
        onLoad={() => setIsLoaded(true)}
        style={{
          opacity: isLoaded ? 1 : 0.6,
          transition: 'opacity 0.3s ease-in-out'
        }}
        loading="lazy"
        decoding="async"
      />

      <style>{`
        .blur-placeholder {
          filter: blur(10px);
        }
      `}</style>
    </picture>
  );
}

/**
 * Example: Using ImageOptimized component
 * 
 * import ImageOptimized from '@/components/ImageOptimized';
 * 
 * export function TeamCard({ team }) {
 *   return (
 *     <div className="team-card">
 *       <ImageOptimized
 *         src={`/images/${team.logo}.jpg`}
 *         alt={`${team.name} logo`}
 *         className="team-logo"
 *         width={200}
 *         height={200}
 *         sizes="(max-width: 768px) 100px, 200px"
 *       />
 *       <h3>{team.name}</h3>
 *     </div>
 *   );
 * }
 * 
 * Requirements for this to work:
 * 1. Run image optimization build script:
 *    ./frontend/build-assets.sh
 * 
 * 2. Script generates variants:
 *    - public/images/optimized/team-logo-200w.webp
 *    - public/images/optimized/team-logo-200w.jpg
 *    - public/images/optimized/team-logo-400w.webp
 *    - ... etc for 400w, 800w, 1600w
 * 
 * 3. Update image paths in components to use optimized versions
 */
