// ─── Follow Request Service (localStorage-based) ──────────────────────────────

export interface FollowRequest {
  id: string;
  senderId: string;
  receiverId: string;
  senderUsername?: string;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
}

const KEY = "linkr_follow_requests";

export function getFollowRequests(): FollowRequest[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FollowRequest[]) : [];
  } catch {
    return [];
  }
}

export function saveFollowRequests(reqs: FollowRequest[]): void {
  localStorage.setItem(KEY, JSON.stringify(reqs));
}

export function getPendingRequestsForUser(uid: string): FollowRequest[] {
  return getFollowRequests().filter(
    (r) => r.receiverId === uid && r.status === "pending",
  );
}

export function getSentRequestsFromUser(uid: string): FollowRequest[] {
  return getFollowRequests().filter((r) => r.senderId === uid);
}

export function hasPendingRequest(
  senderId: string,
  receiverId: string,
): boolean {
  return getFollowRequests().some(
    (r) =>
      r.senderId === senderId &&
      r.receiverId === receiverId &&
      r.status === "pending",
  );
}

export function addFollowRequest(req: FollowRequest): void {
  const reqs = getFollowRequests();
  // Avoid duplicates
  const exists = reqs.some(
    (r) =>
      r.senderId === req.senderId &&
      r.receiverId === req.receiverId &&
      r.status === "pending",
  );
  if (!exists) {
    reqs.unshift(req);
    saveFollowRequests(reqs);
  }
}

export function updateRequestStatus(
  id: string,
  status: "accepted" | "declined",
): void {
  const reqs = getFollowRequests();
  const idx = reqs.findIndex((r) => r.id === id);
  if (idx !== -1) {
    reqs[idx] = { ...reqs[idx], status };
    saveFollowRequests(reqs);
  }
}

export function cancelFollowRequest(
  senderId: string,
  receiverId: string,
): void {
  const reqs = getFollowRequests().filter(
    (r) =>
      !(
        r.senderId === senderId &&
        r.receiverId === receiverId &&
        r.status === "pending"
      ),
  );
  saveFollowRequests(reqs);
}

export function generateFollowRequestId(): string {
  return `fr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
