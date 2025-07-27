"use client";

export const playUserJoinedSound = () => {
  const audio = new Audio("/user-joined.wav");
  audio.play().catch((err) => console.error("Failed to play sound:", err));
};

export const playUserLeftSound = () => {
  const audio = new Audio("/user-left.wav");
  audio.play().catch((err) => console.error("Failed to play sound:", err));
};
