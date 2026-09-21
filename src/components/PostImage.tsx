import { Image } from '@/components/Elements';
import { readImageSize } from '../../scripts/imageSize.mjs';

interface PostImageProps {
  src: string;
  alt: string;
  /** Optional line of text under the image. */
  caption?: string;
  /** Cap the rendered width in pixels; the image never exceeds its own size. */
  maxWidth?: number;
  className?: string;
}

/**
 * Blog image. Dimensions come from the generated media manifest, so the real
 * aspect ratio is always reserved - no hand-typed width/height to get wrong,
 * and no layout shift while it loads.
 */
export default function PostImage({ src, alt, caption, maxWidth, className = '' }: PostImageProps) {
  if (!src.startsWith('/media/') || src.includes('..')) throw new Error('Post images belong in public/media/.');
  // Read dimensions at build/preview time: no generated source file to maintain.
  const meta = readImageSize('public' + src);

  const width = Math.min(meta.width, maxWidth ?? meta.width);

  return (
    <figure className="my-6">
      <Image
        src={src}
        alt={alt}
        width={meta.width}
        height={meta.height}
        sizes="(max-width: 768px) 100vw, 672px"
        style={{ maxWidth: `${width}px` }}
        className={`mx-auto h-auto w-full rounded-lg border border-[var(--border)] ${className}`}
      />
      {caption && (
        <figcaption className="mt-2 text-xs text-[var(--foreground)] opacity-50">{caption}</figcaption>
      )}
    </figure>
  );
}
