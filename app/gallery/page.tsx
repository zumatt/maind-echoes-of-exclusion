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
  const [isOnline, setIsOnline] = useState<boolean>(typeof window !== 'undefined' ? navigator.onLine : true); // Check if in browser

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

  useEffect(() => {
    const handleOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);

    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, []);

  const playNextAudio = async (index: number) => {
    const updatedRes = await fetch("/api/filelist");
    const updatedData: FolderFiles[] = await updatedRes.json();
    const updatedFolders = updatedData.slice(0, 5);
    if (updatedFolders.length === 0) return;
  
    const updatedFolderNames = updatedFolders.map(f => f.folder);
    const previousFolderNames = lastPlayedFolders.current;
  
    const hasChanged = JSON.stringify(updatedFolderNames) !== JSON.stringify(previousFolderNames);
  
    // If the list has changed, restart from the first (index 0)
    const nextIndex = hasChanged ? 0 : index % updatedFolders.length;
  
    setFolders(updatedFolders);
    lastPlayedFolders.current = updatedFolderNames;
    setCurrentIndex(nextIndex);
  
    const nextAudio = updatedFolders[nextIndex].audio;
  
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
          // Move to next index or restart if new content is detected
          playNextAudio(nextIndex + 1);
        }, 2000);
      });
    }
  };
  
  

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "p" && !playedOnce.current && folders.length > 0) {
        e.preventDefault();
        playedOnce.current = true;
        playNextAudio(0);
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
        width: '100dvw',
        height: '100dvh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: '0 auto'
      }}
    >
    {!isOnline && (
      <div style={{ position: 'absolute', top: 0, right: 0 }}>
        <img src="icon_noConnection.svg" alt="No Internet" style={{ width: 25, height: 25 }} />
      </div>
    )}
      <div
        style={{
          display: 'flex',
          width: '95%',
          height: '95%',
          gap: '10px'
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
