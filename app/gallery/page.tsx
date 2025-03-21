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

  useEffect(() => {
    const fetchFiles = async () => {
        const res = await fetch("/api/filelist");
        const data = await res.json();
        const newFolders = data.slice(0, 3);
        const same = JSON.stringify(newFolders) === JSON.stringify(folders);
        if (!same) setFolders(newFolders);
      };      

    fetchFiles();
    const interval = setInterval(fetchFiles, 10000);
    return () => clearInterval(interval);
  }, []);

  const playNextAudio = (index: number) => {
    if (folders.length === 0) return;
  
    const nextIndex = index % folders.length;
    const nextAudio = folders[nextIndex]?.audio;
  
    if (nextAudio) {
      const audio = new Audio(nextAudio);
      audioRef.current = audio;
  
      audio.addEventListener("canplaythrough", () => {
        audio.play();
      });
  
      audio.addEventListener("ended", () => {
        setTimeout(() => {
          playNextAudio((nextIndex + 1) % folders.length);
        }, 2000);
      });
  
      setCurrentIndex(nextIndex);
    }
  };
  

  useEffect(() => {
    if (!audioRef.current) return;

    const handleEnded = () => {
      setTimeout(() => {
        playNextAudio((currentIndex + 1) % folders.length);
      }, 2000);
    };

    const audio = audioRef.current;
    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [folders, currentIndex]);

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
  const { originalImage, generatedImage, audio } = folders[currentIndex];

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
        <audio ref={audioRef} src={audio} />
      </div>
    </div>
  );
}