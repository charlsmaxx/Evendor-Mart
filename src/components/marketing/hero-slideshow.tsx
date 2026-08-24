"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export const HERO_SLIDESHOW_IMAGES = [
  {
    src: "/images/1.png",
    alt: "Bride and groom at a Nigerian wedding",
    objectClass: "object-[center_22%] md:object-[center_16%]",
  },
  { src: "/images/2.jpg", alt: "Guests celebrating at a live event" },
  { src: "/images/3.jpg", alt: "Wedding and event celebration" },
  { src: "/images/4.jpg", alt: "Couples and guests at an event" },
  { src: "/images/5.jpg", alt: "Luxury event atmosphere" },
  { src: "/images/6.jpg", alt: "Event guests dressed for a celebration" },
  { src: "/images/7.jpg", alt: "Nigerian wedding celebration" },
  { src: "/images/8.jpg", alt: "Guests enjoying an event" },
  { src: "/images/9.jpg", alt: "Event hall celebration" },
] as const;

const INTERVAL_MS = 9000;
const FADE_MS = 2000;

type HeroSlideshowProps = {
  sizes: string;
  className?: string;
  imageClassName?: string;
  priorityFirst?: boolean;
};

export function HeroSlideshow({
  sizes,
  className,
  imageClassName,
  priorityFirst = true,
}: HeroSlideshowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const el = rootRef.current;
    if (!el) return;

    let timer = 0;
    let inView = false;

    const stop = () => {
      window.clearInterval(timer);
      timer = 0;
    };
    const start = () => {
      if (timer || document.hidden || !inView) return;
      timer = window.setInterval(() => {
        setIndex((current) => (current + 1) % HERO_SLIDESHOW_IMAGES.length);
      }, INTERVAL_MS);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
        else stop();
      },
      { threshold: 0.2 }
    );
    observer.observe(el);

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduceMotion]);

  return (
    <div
      ref={rootRef}
      className={cn("absolute inset-0 overflow-hidden bg-[#1a1214]", className)}
    >
      {HERO_SLIDESHOW_IMAGES.map((image, i) => (
        <Image
          key={image.src}
          src={image.src}
          alt={i === index ? image.alt : ""}
          fill
          priority={priorityFirst && i === 0}
          quality={90}
          sizes={sizes}
          className={cn(
            "object-cover",
            "objectClass" in image ? image.objectClass : "object-center",
            imageClassName
          )}
          style={{
            opacity: i === index ? 1 : 0,
            transition: reduceMotion ? "none" : `opacity ${FADE_MS}ms ease-in-out`,
          }}
        />
      ))}
    </div>
  );
}
