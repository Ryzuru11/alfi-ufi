/**
 * Session store menggunakan global variable.
 * Di Vercel serverless, setiap function instance punya memory sendiri,
 * tapi untuk skala acara nikah (ratusan tamu) ini cukup.
 */

export interface Session {
  sessionId: string;
  tokensRemaining: number;
  photosUploaded: number;
  createdAt: Date;
  lastActivity: Date;
}

export interface UploadLog {
  sessionId: string;
  fileId: string;
  fileName: string;
  webViewLink: string;
  uploadedAt: Date;
}

const TOKENS_PER_SESSION = parseInt(process.env.TOKENS_PER_SESSION || "5");

// Global store — persist selama instance hidup
declare global {
  // eslint-disable-next-line no-var
  var __sessions: Map<string, Session> | undefined;
  // eslint-disable-next-line no-var
  var __uploadLog: UploadLog[] | undefined;
}

const sessions: Map<string, Session> = global.__sessions ?? new Map();
const uploadLog: UploadLog[] = global.__uploadLog ?? [];

if (!global.__sessions) global.__sessions = sessions;
if (!global.__uploadLog) global.__uploadLog = uploadLog;

export function createSession(sessionId: string): Session {
  const session: Session = {
    sessionId,
    tokensRemaining: TOKENS_PER_SESSION,
    photosUploaded: 0,
    createdAt: new Date(),
    lastActivity: new Date(),
  };
  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): Session | null {
  return sessions.get(sessionId) ?? null;
}

export function useToken(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session || session.tokensRemaining <= 0) return false;
  session.tokensRemaining -= 1;
  session.lastActivity = new Date();
  return true;
}

export function recordUpload(sessionId: string, fileInfo: { fileId: string; fileName: string; webViewLink: string }) {
  const session = sessions.get(sessionId);
  if (session) {
    session.photosUploaded += 1;
    session.lastActivity = new Date();
  }
  uploadLog.unshift({ sessionId, ...fileInfo, uploadedAt: new Date() });
  if (uploadLog.length > 500) uploadLog.pop();
}

export function getStats() {
  const all = Array.from(sessions.values());
  return {
    totalSessions: all.length,
    totalPhotos: uploadLog.length,
    activeSessions: all.filter(s => s.tokensRemaining > 0).length,
    recentUploads: uploadLog.slice(0, 20),
  };
}
