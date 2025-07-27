"use client";

import { AlertTriangle, Home, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const RoomNotFound = () => {
  const params = useParams();
  const roomId = params?.channelName as string;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        {/* Error Icon */}
        <div className="mx-auto mb-6 w-15 h-15 bg-red-200 rounded-full flex items-center justify-center">
          <AlertTriangle size={28} className="text-red-500" />
        </div>

        {/* Error Message */}
        <h1 className="text-2xl font-bold">
          Room Not Found
        </h1>
        
        {/* Possible Reasons */}
        <div className="rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold mb-2 text-sm">
            Possible reasons:
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-500 space-y-1">
            <li>• The room ID was typed incorrectly</li>
            <li>• The room has already ended</li>
            <li>• The room link has expired</li>
            <li>• The host hasn't created the room yet</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <button className="space-y-3">
          <Link
            href="/"
            className="gap-3 text-base flex items-center justify-around px-5 py-2 bg-background border border-foreground/70 hover:opacity-80 text-foreground rounded-lg cursor-pointer"
          >
            <Home size={20} />
            Go to Home
          </Link>
        </button>

        {/* Help Text */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Double-check the room ID with the person who invited you, or create a new room to start your call.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoomNotFound;