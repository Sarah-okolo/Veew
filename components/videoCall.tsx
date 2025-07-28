"use client";

import {
  LocalUser,
  RemoteUser,
  useIsConnected,
  useJoin,
  useLocalMicrophoneTrack,
  useLocalCameraTrack,
  usePublish,
  useRemoteUsers,
  useClientEvent,
} from "agora-rtc-react";
import React, { useState, useEffect, useCallback } from "react";
import { AGORA_APP_ID } from "@/lib/agoraConfig";
import { playUserJoinedSound, playUserLeftSound, playRecordStartSound } from "@/utils/sounds";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Captions, CaptionsOff, Link, PencilLine, PencilOff } from "lucide-react";
import LiveCaption from "./liveCaption";
import { toast } from "sonner"
import AgoraRTC from "agora-rtc-react";
import { useLiveCaptionsContext } from "./liveCaptionContext";


type VideoCallProps = {
  channelName: string;
  roomUserName: string;
  client: ReturnType<typeof AgoraRTC.createClient>;
  onCallEnd?: () => void; // Optional callback when call ends
  currentSpeakerRef: React.RefObject<string | number | null>;
};

const VideoCall: React.FC<VideoCallProps> = ({ currentSpeakerRef, channelName, roomUserName, client, onCallEnd }) => {
  const remoteUsers = useRemoteUsers();
  const isConnected = useIsConnected();
   const {
    isListening,
    startTranscription,
    stopTranscription,
    minutesInSession,
    setMinutesInSession,
    minutesBuffer,
    setMinutesBuffer,
    minutesInSessionRef,
  } = useLiveCaptionsContext();
  
  // Call state
  const [calling, setCalling] = useState(false);
  const [micOn, setMic] = useState(true);
  const [cameraOn, setCamera] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [_isLoadingToken, setIsLoadingToken] = useState(true);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  // Local tracks
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
  const { localCameraTrack } = useLocalCameraTrack(cameraOn);
  

  // Join channel and publish tracks
  useJoin(
    { 
      appid: AGORA_APP_ID, 
      channel: channelName, 
      token: token,
      uid: roomUserName
    }, 
    calling && token !== null // Only join when we have a token
  );
  
  usePublish([localMicrophoneTrack, localCameraTrack]);

  // Fetch token and start the call
  useEffect(() => {
    const fetchTokenAndJoin = async () => {
      try {
        setIsLoadingToken(true);
        const response = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            channelName, 
            uid: roomUserName 
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch token');
        }
        
        const data = await response.json();
        setToken(data.token);
        setCalling(true);

      } catch (error) {
        console.error('Error fetching token:', error);
        // Fallback: you could redirect to error page or show error message
      } finally {
        setIsLoadingToken(false);
      }
    };

    fetchTokenAndJoin();

    return () => {
      setCalling(false);
    };
  }, [channelName, roomUserName]);

  client.enableAudioVolumeIndicator();

  client.on('volume-indicator', (volumes) => {
    volumes.forEach((vol) => {
      const { uid, level } = vol;
      if (level > 25) {
        currentSpeakerRef.current = uid;
      }
    });
  });

  
  useEffect(() => {
    if (!recordingStartTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const seconds = Math.floor((now - recordingStartTime) / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      setElapsedTime(
        `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [recordingStartTime]);


  // Toggle audio track
  const toggleAudio = useCallback(async () => {
    try {
      if (localMicrophoneTrack) {
        await localMicrophoneTrack.setEnabled(!micOn);
        setMic(!micOn);
      }
    } catch (error) {
      console.error("Error toggling audio:", error);
    }
  }, [localMicrophoneTrack, micOn]);

  // Toggle video track
  const toggleVideo = useCallback(async () => {
    try {
      if (localCameraTrack) {
        await localCameraTrack.setEnabled(!cameraOn);
        setCamera(!cameraOn);
      }
    } catch (error) {
      console.error("Error toggling video:", error);
    }
  }, [localCameraTrack, cameraOn]);

  
  const downloadMinutes = () => {
    if (minutesBuffer.length === 0) return;
    const content = minutesBuffer
      .map(t => `[${t.timestamp}] ${t.speaker}: ${t.text}`)
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-minutes-${Date.now()}.txt`;
    a.click();

    toast.success("Meeting minutes downloaded successfully!");

    URL.revokeObjectURL(url); // clean up
  };


  const recordMinutes = () => {
    if (minutesInSession) {
      // Stop session
      setMinutesInSession(false);
      downloadMinutes();
      minutesInSessionRef.current = false; // ⬅️ Logic will have latest value
      setRecordingStartTime(null); // reset
    } else {
      // Start session
      setMinutesBuffer([]);
      setMinutesInSession(true);
      minutesInSessionRef.current = true;  // ⬅️ Logic will have latest value
      setRecordingStartTime(Date.now()); // mark start time
      playRecordStartSound(); // play sound
    }
  };

  // End call
  const endCall = useCallback(async () => {
    try {
      // Stop and close local tracks
      if (localMicrophoneTrack) {
        localMicrophoneTrack.stop();
        localMicrophoneTrack.close();
      }
      if (localCameraTrack) {
        localCameraTrack.stop();
        localCameraTrack.close();
      }

      downloadMinutes(); // Download minutes if any
      
      // Leave the channel
      await client.leave();
      setCalling(false);
      
      // Call the optional callback or redirect
      if (onCallEnd) {
        onCallEnd();
      }
    } catch (error) {
      console.error("Error ending call:", error);
      // Force end call even if there's an error
      setCalling(false);
      if (onCallEnd) {
        onCallEnd();
      }
    }
  }, [localMicrophoneTrack, localCameraTrack, client, onCallEnd, downloadMinutes]);

  // Listen for user events
  useClientEvent(client, "user-joined", (user) => {
    console.log(`User joined: ${user.uid}`);
    playUserJoinedSound();
  });

  useClientEvent(client, "user-left", (user) => {
    console.log(`User left: ${user.uid}`);
    playUserLeftSound();
  });

  // Handle connection errors
  useClientEvent(client, "connection-state-change", (curState, revState) => {
    console.log(`Connection state changed: ${revState} -> ${curState}`);
  });
  

  useEffect(() => {
    if(isConnected) {
      playUserJoinedSound();
    }
  }, [isConnected]);

  // copy the invite link to clipboard
  const inviteUser = () => {
    const inviteLink = `${window.location.origin}/channel/${channelName}`;
    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        toast.success( "Invite link copied to clipboard!")
      })
      .catch(() => {
        toast.error( "Failed to copy invite link" )
      });
  }

  // Show loading state while fetching token
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Connecting to room {channelName}...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen p-5 bg-gray-900">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm text-gray-300">Room: {channelName}</p>
          <p className="text-xs text-gray-500">
            Status: {isConnected ? "Connected" : "Connecting..."}
          </p>
        </div>
        <div className="text-sm text-gray-300">
          <div>
            <span>Participants: {remoteUsers.length + 1}</span>
             { minutesInSession && (
                <span className="ml-4 text-purple-500 animate-pulse flex gap-2 items-center">
                  <PencilLine size={12} />
                  Recording Minutes:
                  <span className="font-mono text-sm">
                    {elapsedTime}
                  </span>
                </span>
              )}

          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="py-5 px-5 sm:px-10 lg:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[70vh]">
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            <LocalUser
              audioTrack={localMicrophoneTrack}
              cameraOn={cameraOn}
              micOn={micOn}
              videoTrack={localCameraTrack}
              style={{ width: '100%', height: '100%' }}
            />
            <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
              You ({roomUserName})
            </div>
            {!micOn && (
              <div className="absolute top-2 right-2 bg-red-500 p-1 rounded">
                <MicOff size={16} className="text-white" />
              </div>
            )}
          </div>

          {/* Remote Videos */}
          {remoteUsers.map((user) => (
            <div key={user.uid} className="relative bg-gray-800 rounded-lg overflow-hidden">
              <RemoteUser 
                user={user} 
                style={{ width: '100%', height: '100%' }}
              />
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                {user.uid}
              </div>
              {user.hasAudio === false && (
                <div className="absolute top-2 right-2 bg-red-500 p-1 rounded">
                  <MicOff size={16} className="text-white" />
                </div>
              )}
            </div>
          ))}
          
          {/* Empty slots for visual consistency */}
          {remoteUsers.length === 0 && (
            <div className="bg-gray-800 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">Waiting for others to join...</p>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
        {/* Live Captions */}
        <div className="mb-3 w-full max-w-3xl px-4 z-50">
          <LiveCaption />
        </div>

        <div className="flex gap-4 bg-white/10 backdrop-blur-md py-3 px-6 rounded-full">
          <button
            onClick={() => isListening ? stopTranscription() : startTranscription()}
            className={`p-3 cursor-pointer rounded-full transition-colors ${
              isListening 
                ? 'bg-gray-700 hover:bg-gray-600 text-green-400' 
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={isListening ? "Turn off live caption" : "Turn on live caption"}
          >
            {isListening ? <Captions size={20} /> : <CaptionsOff size={20} />}
          </button>

          <button
            onClick={toggleAudio}
            className={`p-3 cursor-pointer rounded-full transition-colors ${
              micOn 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={micOn ? "Mute microphone" : "Unmute microphone"}
          >
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          
          <button
            onClick={toggleVideo}
            className={`p-3 cursor-pointer rounded-full transition-colors ${
              cameraOn 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={cameraOn ? "Turn off camera" : "Turn on camera"}
          >
            {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
          
          <button
            onClick={endCall}
            className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors cursor-pointer"
            title="End call"
          >
            <PhoneOff size={20} />
          </button>

          <button 
            onClick={inviteUser}
            className="rounded-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 flex items-center gap-2 cursor-pointer">
            <Link size={20}/> <span className="hidden sm:block">Invite</span>
          </button>

          <button
            onClick={recordMinutes}
            className={`p-3 cursor-pointer rounded-full transition-colors ${
              minutesInSession 
                ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
            title={minutesInSession ? "Stop recording minutes" : "Start recording minutes"}
          >
            {minutesInSession ? 
            <span className="flex items-center gap-2 animate-pulse">
             <PencilLine size={20} /> 
              <span className="hidden sm:block">Recording...</span>
            </span>
            : 
            <span className="flex items-center gap-2">
              <PencilOff size={20} /> 
              <span className="hidden sm:block min-w-max">Minutes</span>
            </span>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;