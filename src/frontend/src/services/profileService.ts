import type { UserProfile } from "../backend.d";
import type { AppUser } from "../types";

export function backendProfileToAppUser(profile: UserProfile): AppUser {
  return {
    uid: profile._id.toString(),
    username: profile.username,
    email: profile.email || "",
    profilePicture:
      profile.profilePicture ||
      `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(profile.username)}&backgroundColor=8b5cf6&textColor=ffffff`,
    bio: profile.bio,
    isPrivate: profile.isPrivate,
    onlineStatus: profile.onlineStatus,
    lastSeen:
      typeof profile.lastSeen === "bigint"
        ? Number(profile.lastSeen / BigInt(1_000_000))
        : Date.now(),
    blockedUsers: profile.blockedUsers.map((p) => p.toString()),
    followers: profile.followers.map((p) => p.toString()),
    following: profile.following.map((p) => p.toString()),
    createdAt:
      typeof profile.createdAt === "bigint"
        ? Number(profile.createdAt / BigInt(1_000_000))
        : Date.now(),
    fullName: profile.fullName || "",
    phoneNumber: profile.phoneNumber || "",
    birthDate: profile.birthDate || "",
    timezone: profile.timezone || "",
    websiteUrl: profile.websiteUrl || "",
  };
}
