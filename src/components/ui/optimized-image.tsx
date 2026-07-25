import Image, { type ImageProps } from "next/image";
import { optimizeImageUrl, type ImagePreset } from "@/lib/cloudinary-url";

type OptimizedImageProps = Omit<ImageProps, "src"> & {
  src: string | null | undefined;
  preset?: ImagePreset;
};

/** next/image wrapper that applies Cloudinary f_auto/q_auto + size presets before load. */
export function OptimizedImage({ src, preset, alt = "", ...props }: OptimizedImageProps) {
  const resolved = optimizeImageUrl(src, preset ? { preset } : {});
  if (!resolved) return null;
  return <Image src={resolved} alt={alt} {...props} />;
}
