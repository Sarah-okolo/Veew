"use client";

import { MoveRight, Video } from "lucide-react";
import TextChanger from "@/components/TextChanger";
import { AuroraBackground } from "@/components/AuroraBackground";
import { AlertDialog, AlertDialogTrigger, } from "@/components/ui/alert-dialog"
import NewRoomForm from "@/components/newRoomForm";
import JoinRoomForm from "@/components/joinRoomForm";
import { useRouter } from "next/navigation";


export default function Home() {
  const router = useRouter();

  const handleCreateRoom = ({ name, channelName }: { name: string; channelName: string }) => {
    localStorage.setItem("roomUserName", name);
    router.push(`/channel/${channelName}`);
  };

  const handleJoinRoom = ({ name, channelName }: { name: string; channelName: string }) => {
    localStorage.setItem("roomUserName", name);
    router.push(`/channel/${channelName}`);
  };

 
  return (
    <div className="w-full">
      <div className="mx-auto min-h-screen">
        <AuroraBackground>
          <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col z-50">
            <div className="flex gap-4 flex-col">
              <h1 className="text-5xl md:text-7xl max-w-2xl tracking-tighter text-center font-regular">
                <span className="text-spektr-cyan-50">Veew - Something</span>
                <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
                  &nbsp;
                  <TextChanger />
                </span>
              </h1>
              <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center">
                Simplify communication with smart video calls that offer live captions, real-time translation, and automatic meeting minutes. We are here to make virtual meetings clearer, faster, and more productive.
              </p>
            </div>
            <div className="flex flex-row gap-6 mt-3">
              <AlertDialog>
                <AlertDialogTrigger className="gap-3 text-lg flex items-center justify-around px-5 py-2 bg-foreground hover:bg-foreground/80 text-background rounded-lg cursor-pointer">
                  Create Room <Video className="w-4 h-4" />
                </AlertDialogTrigger>
                <NewRoomForm onCreate={handleCreateRoom}/>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger className="gap-3 text-lg flex items-center justify-around px-5 py-2 bg-background border border-foreground/70 hover:opacity-80 text-foreground rounded-lg cursor-pointer">
                  Join Room <MoveRight className="w-4 h-4" />
                </AlertDialogTrigger>
                <JoinRoomForm 
                  onJoin={handleJoinRoom}
                />
              </AlertDialog>
            </div>
          </div>
        </AuroraBackground>
      </div>
    </div>
  );
};