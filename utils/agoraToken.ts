// utils/agoraToken.ts

export const fetchAgoraToken = async (channelName: string, uid: string) => {
  try {
    const response = await fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelName, uid })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Agora token:', error);
    throw error;
  }
};

// Helper function to check if token is about to expire
export const isTokenExpiringSoon = (expiry: number, thresholdMinutes: number = 5): boolean => {
  const now = Math.floor(Date.now() / 1000);
  const thresholdSeconds = thresholdMinutes * 60;
  return (expiry - now) <= thresholdSeconds;
};