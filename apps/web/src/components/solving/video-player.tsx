"use client";

import { useState, useRef, useEffect } from "react";
// No decorative icons needed
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────

interface VideoMeta {
  url: string;
  title: string;
}

interface VideoPlayerProps {
  videos: VideoMeta[];
}

// ─── Lazy video element: loads only when visible ──────────────────────

function LazyVideo({ url, title }: { url: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      {isVisible ? (
        <video
          controls
          preload="metadata"
          className="w-full rounded-md"
          aria-label={title}
        >
          <source src={url} />
          <track kind="captions" />
          <p>お使いのブラウザは動画再生に対応していません。</p>
        </video>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-md bg-muted">
          <span className="text-sm text-muted-foreground">読み込み中...</span>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────

export function VideoPlayer({ videos }: VideoPlayerProps) {
  if (!videos || videos.length === 0) return null;

  // Single video: no tabs needed
  if (videos.length === 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            解説動画
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LazyVideo url={videos[0].url} title={videos[0].title} />
          {videos[0].title && (
            <p className="mt-2 text-sm text-muted-foreground">
              {videos[0].title}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Multiple videos: use tabs
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          解説動画
          <span className="text-sm font-normal text-muted-foreground">
            {videos.length}本
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="0">
          <TabsList className="w-full">
            {videos.map((video, index) => (
              <TabsTrigger
                key={index}
                value={String(index)}
                className="flex-1"
              >
                {video.title || `動画 ${index + 1}`}
              </TabsTrigger>
            ))}
          </TabsList>
          {videos.map((video, index) => (
            <TabsContent key={index} value={String(index)}>
              <LazyVideo url={video.url} title={video.title} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
