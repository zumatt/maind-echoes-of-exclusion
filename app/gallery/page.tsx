"use client";

import { useEffect, useRef, useState } from "react";

interface FolderFiles {
  folder: string;
  originalImage: string;
  generatedImage: string;
  audio: string;
}

export default function Gallery() {
  const [folders, setFolders] = useState<FolderFiles[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedOnce = useRef(false);
  const isPlaying = useRef(false);
  const lastPlayedFolders = useRef<string[]>([]);

  const fetchFiles = async () => {
    const res = await fetch("/api/filelist");
    const data: FolderFiles[] = await res.json();
    const newFolders = data.slice(0, 3);
    const newFolderNames = newFolders.map(f => f.folder);

    const hasChanged = JSON.stringify(newFolderNames) !== JSON.stringify(lastPlayedFolders.current);

    if (hasChanged) {
      lastPlayedFolders.current = newFolderNames;
      setFolders(newFolders);

      // If we're in the middle of playback, update the current audio to match the new list
      if (isPlaying.current && audioRef.current && newFolders[currentIndex]) {
        const nextAudio = newFolders[currentIndex].audio;
        const audio = audioRef.current;
        audio.pause();
        audio.src = nextAudio;
        audio.load();
        audio.addEventListener("canplaythrough", () => {
          audio.play();
        }, { once: true });
      }
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const playNextAudio = async (index: number) => {
    if (folders.length === 0) return;

    const nextIndex = index % folders.length;
    setCurrentIndex(nextIndex);

    const updatedRes = await fetch("/api/filelist");
    const updatedData: FolderFiles[] = await updatedRes.json();
    const updatedFolders = updatedData.slice(0, 3);
    setFolders(updatedFolders);
    lastPlayedFolders.current = updatedFolders.map(f => f.folder);

    const nextAudio = updatedFolders[nextIndex]?.audio;

    if (nextAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }

      const audio = new Audio(nextAudio);
      audioRef.current = audio;

      audio.addEventListener("canplaythrough", () => {
        isPlaying.current = true;
        audio.play();
      });

      audio.addEventListener("ended", async () => {
        isPlaying.current = false;
        setTimeout(() => {
          playNextAudio((nextIndex + 1) % updatedFolders.length);
        }, 2000);
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "p" && !playedOnce.current && folders.length > 0) {
        e.preventDefault();
        playedOnce.current = true;
        playNextAudio(currentIndex);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [folders, currentIndex]);

  if (folders.length === 0) return <div>Loading...</div>;
  const { originalImage, generatedImage } = folders[currentIndex];

  return (
    <div
      style={{
        width: '95vw',
        height: '95vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
        }}
      >
        <img
          src={originalImage}
          alt="Original"
          style={{
            width: '50%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <img
          src={generatedImage}
          alt="Generated"
          style={{
            width: '50%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>
    </div>
  );
}
