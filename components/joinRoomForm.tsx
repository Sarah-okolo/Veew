"use client";

import { useState } from "react";
import {
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";

type JoinRoomFormProps = {
  onJoin: (data: { name: string; channelName: string }) => void;
};

function JoinRoomForm({ onJoin }: JoinRoomFormProps) {
  const [name, setName] = useState("");
  const [channelName, setChannelName] = useState("");

  const handleJoin = () => {
    if (!name.trim() || !channelName.trim()) return;
    onJoin({ name, channelName: channelName.toLowerCase() });
  };

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Join Room</AlertDialogTitle>
        <AlertDialogDescription>
          Enter the room ID to join an existing video call. If room does not exist, a new room would be created for you.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div className="flex flex-col gap-2 mt-4">
        <label htmlFor="name">Name</label>
        <input
          type="text"
          placeholder="Enter your display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded mb-2"
        />

        <label htmlFor="channelName">Room ID</label>
        <input
          type="text"
          placeholder="Enter room ID (e.g., abc123)"
          value={channelName}
          onChange={(e) => setChannelName(e.target.value.toLowerCase())}
          className="border p-2 rounded"
          maxLength={10}
        />
      </div>

      <AlertDialogFooter className="mt-4">
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction 
          onClick={handleJoin}
          disabled={!name.trim() || !channelName.trim()}
        >
          Join
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

export default JoinRoomForm;