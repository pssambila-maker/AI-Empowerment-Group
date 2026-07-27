// ─────────────────────────────────────────────────────────────────
// Real-time messaging channel between a client and the consultant.
// Backed by the Firestore collection conversations/{uid}/messages.
// ─────────────────────────────────────────────────────────────────

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  type Firestore,
  type Timestamp,
} from "firebase/firestore";

export interface PortalMessage {
  text: string;
  sender: "client" | "consultant";
  timestamp: Timestamp | null;
}

/** Subscribes to newly-added messages for this user's conversation. Returns an unsubscribe function. */
export function subscribeToMessages(db: Firestore, uid: string, onMessageAdded: (message: PortalMessage) => void): () => void {
  const messagesRef = collection(db, "conversations", uid, "messages");
  const q = query(messagesRef, orderBy("timestamp", "asc"));

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const data = change.doc.data();
        onMessageAdded({ text: data.text, sender: data.sender, timestamp: data.timestamp ?? null });
      }
    });
  });
}

export async function sendMessage(db: Firestore, uid: string, text: string): Promise<void> {
  await addDoc(collection(db, "conversations", uid, "messages"), {
    text,
    sender: "client",
    timestamp: serverTimestamp(),
    read: false,
  });
}
