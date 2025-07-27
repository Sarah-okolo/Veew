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

type NewRoomFormProps = {
  onCreate: (data: { name: string; channelName: string }) => void;
};

function NewRoomForm({ onCreate }: NewRoomFormProps) {
  const [name, setName] = useState("");
  const [channelName, setChannelName] = useState(() =>
    Math.random().toString(36).substring(2, 8)
  );

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate({ name, channelName });
  };

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Create New Room</AlertDialogTitle>
        <AlertDialogDescription>
          Enter your display name to start a video call. You can invite others to join this room by sharing the room ID.
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
          readOnly
          type="text"
          placeholder="Room ID"
          value={channelName}
          onChange={(e) => setChannelName(e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      <AlertDialogFooter className="mt-4">
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={handleCreate}>Create</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

export default NewRoomForm;
