// app/api/token/route.ts
import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { channelName, uid } = await request.json();
    
    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE!;
    
    if (!appId || !appCertificate) {
      return Response.json(
        { error: 'Missing Agora credentials' }, 
        { status: 500 }
      );
    }
    
    if (!channelName || !uid) {
      return Response.json(
        { error: 'Missing channelName or uid' }, 
        { status: 400 }
      );
    }

    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600; // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      role,
      privilegeExpiredTs,
      privilegeExpiredTs
    );

    return Response.json({ 
      token,
      uid,
      channelName,
      expiry: privilegeExpiredTs 
    });
    
  } catch (error) {
    console.error('Token generation error:', error);
    return Response.json(
      { error: 'Failed to generate token' }, 
      { status: 500 }
    );
  }
}