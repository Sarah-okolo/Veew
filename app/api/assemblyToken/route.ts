import axios from 'axios';
import { NextResponse } from 'next/server';
import {ASSEMBLYAI_API_KEY} from '@/lib/assemblyConfig';

export async function GET(): Promise<NextResponse> {
  const expiresInSeconds = 600; // 10 minutes
  const url = `https://streaming.assemblyai.com/v3/token?expires_in_seconds=${expiresInSeconds}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: ASSEMBLYAI_API_KEY,
      },
    });

    return NextResponse.json({ token: response.data.token });
  } catch  {
    console.error("Error generating temp token");
    return NextResponse.json(
      { error: "Failed to fetch token" }, 
      { status: 500 }
    );
  }
}