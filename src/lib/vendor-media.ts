export const MAX_FEATURED_IMAGES = 7;
export const MAX_FEATURED_CLIPS = 3;

export type UploadedMedia = {
  url: string;
  publicId: string;
  resourceType?: string;
};

export function isVideoMedia(item: { url: string; resourceType?: string }) {
  return (
    item.resourceType === "video" ||
    /\.(mp4|mov|webm)(\?|$)/i.test(item.url) ||
    item.url.includes("/video/upload/")
  );
}

export function featuredImagesPayload(slots: (UploadedMedia | null)[]) {
  return slots
    .filter((s): s is UploadedMedia => Boolean(s))
    .filter((s) => !isVideoMedia(s))
    .slice(0, MAX_FEATURED_IMAGES);
}

export function featuredClipsPayload(slots: (UploadedMedia | null)[]) {
  return slots
    .filter((s): s is UploadedMedia => Boolean(s))
    .slice(0, MAX_FEATURED_CLIPS);
}
