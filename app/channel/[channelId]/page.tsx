"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AgoraRTC, { AgoraRTCProvider } from "agora-rtc-react";
import VideoCall from "@/components/videoCall";
import { LiveCaptionsProvider } from "@/components/liveCaptionContext";

export default function ChannelPage() {
  const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
  const params = useParams();
  const channelId = params?.channelId as string;
  const [roomUserName, setRoomUserName] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("roomUserName");
    if (stored) 
      setRoomUserName(stored);
    else {
      setOpenDialog(true);
      return;
    }
  }, [openDialog]);


   const handleCallEnd = () => {
    // Clean up and redirect
    localStorage.removeItem("roomUserName"); // Optional: clear stored name
    window.location.href = "/"; // Redirect to home
  };

  return (
    <main>
      {roomUserName && !openDialog && 
        <AgoraRTCProvider client={client}>
          <LiveCaptionsProvider>
            <VideoCall channelName={channelId} roomUserName={roomUserName} client={client} onCallEnd={handleCallEnd}/>
          </LiveCaptionsProvider>
        </AgoraRTCProvider>
      }

      {/* Collect username if user came in through link */}
      { openDialog &&
        <div className="h-screen p-10 flex items-center justify-center">
          <div className=" flex items-center flex-col">
            <h1 className="text-2xl font-bold flex justify-center text-center mb-2">Join Room</h1>
            <p className="text-gray-600 dark:text-gray-900">Enter your display name to join the room. If room does not exist, a new room would be created for you.</p>
            <div className="w-80">
              <input
                type="text"
                placeholder="Enter your display name"
                value={roomUserName}
                onChange={(e) => setRoomUserName(e.target.value)}
                className="border p-2 rounded-md my-7 w-full"
              />
            </div>
            
            <button
              onClick={() => {
              if (!roomUserName.trim()) return;
              localStorage.setItem("roomUserName", roomUserName);
              setOpenDialog(false);}
            }
            disabled={!roomUserName.trim()}
            className="gap-3 text-lg px-5 py-2 max-w-max bg-foreground hover:bg-foreground/80 text-background rounded-lg cursor-pointer"
            >
              Join
            </button>
          </div>
        </div>
      }
      
    </main>
  );
}