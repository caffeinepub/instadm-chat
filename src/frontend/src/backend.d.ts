import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type UserId = Principal;
export type Timestamp = bigint;
export interface GroupChat {
    id: string;
    members: Array<UserId>;
    name: string;
    createdAt: Timestamp;
    lastMessage?: string;
    lastUpdated: Timestamp;
    typing: Array<[string, boolean]>;
    description: string;
    adminId: UserId;
}
export interface Chat {
    muted: Array<[string, boolean]>;
    participants: Array<UserId>;
    vanishMode: boolean;
    createdAt: Timestamp;
    lastMessage?: MessageId;
    lastUpdated: Timestamp;
    typing: Array<[string, boolean]>;
    pinned: Array<[string, boolean]>;
    archived: Array<[string, boolean]>;
}
export type MessageId = string;
export interface Message {
    edited: boolean;
    createdAt: Timestamp;
    text: string;
    vanish: boolean;
    seenBy: Array<UserId>;
    mediaUrl: string;
    messageType: MessageType;
    deletedForEveryone: boolean;
    replyTo?: MessageId;
    editedAt?: Timestamp;
    reactions: Array<[string, Array<UserId>]>;
    senderId: UserId;
}
export interface UserProfile {
    _id: UserId;
    bio: string;
    blockedUsers: Array<UserId>;
    timezone: string;
    fcmToken: string;
    username: string;
    birthDate: string;
    websiteUrl: string;
    createdAt: Timestamp;
    fullName: string;
    email: string;
    isPrivate: boolean;
    onlineStatus: boolean;
    phoneNumber: string;
    followers: Array<UserId>;
    following: Array<UserId>;
    profilePicture: string;
    lastSeen: Timestamp;
}
export enum MessageType {
    gif = "gif",
    video = "video",
    voice = "voice",
    file = "file",
    text = "text",
    image = "image"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addGroupMember(groupId: string, userId: Principal): Promise<void>;
    addReaction(chatId: string, messageId: string, emoji: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    blockUser(targetId: Principal): Promise<void>;
    createGroupChat(name: string, description: string, memberIds: Array<Principal>): Promise<string>;
    createOrUpdateUserProfile(profile: UserProfile): Promise<void>;
    createTemporaryFolder(folderName: string): Promise<void>;
    deleteAccount(): Promise<void>;
    deleteMessageForEveryone(chatId: string, messageId: string): Promise<void>;
    deleteTemporaryFolder(folderName: string): Promise<void>;
    editMessage(chatId: string, messageId: string, newText: string): Promise<void>;
    followUser(targetId: Principal): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChatById(chatId: string): Promise<Chat | null>;
    getChatMessages(chatId: string, afterTimestamp: bigint): Promise<Array<Message>>;
    getEmailByPhoneNumber(_phoneNumber: string): Promise<string>;
    getGroupById(groupId: string): Promise<GroupChat | null>;
    getGroupMessages(groupId: string, afterTimestamp: bigint): Promise<Array<Message>>;
    getLifestyleChoices(): Promise<Array<string>>;
    getMyChats(): Promise<Array<Chat>>;
    getMyGroupChats(): Promise<Array<GroupChat>>;
    getOrCreateChat(otherUser: Principal): Promise<Chat>;
    getPersonalityTypes(): Promise<Array<string>>;
    getRelationshipStatuses(): Promise<Array<string>>;
    getTemporaryFolders(): Promise<Array<string>>;
    getTypingStatus(chatId: string): Promise<Array<[string, boolean]>>;
    getUserProfile(userId: Principal): Promise<UserProfile | null>;
    getWellBeingPractices(): Promise<Array<string>>;
    isCallerAdmin(): Promise<boolean>;
    leaveGroup(groupId: string): Promise<void>;
    markGroupMessagesSeen(groupId: string): Promise<void>;
    markMessagesSeen(chatId: string): Promise<void>;
    removeGroupMember(groupId: string, userId: Principal): Promise<void>;
    removeReaction(chatId: string, messageId: string, emoji: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchFolders(searchText: string): Promise<Array<string>>;
    searchProfiles(searchText: string): Promise<Array<UserProfile>>;
    searchUsersByUsername(searchText: string): Promise<Array<UserProfile>>;
    searchUsersByUsernamePrefix(prefix: string): Promise<Array<UserProfile>>;
    sendGroupMessage(groupId: string, text: string, messageType: string, mediaUrl: string, replyTo: string): Promise<Message>;
    sendMessage(chatId: string, text: string, messageType: string, mediaUrl: string, replyTo: string): Promise<Message>;
    setGroupTypingStatus(groupId: string, isTyping: boolean): Promise<void>;
    setTypingStatus(chatId: string, isTyping: boolean): Promise<void>;
    toggleArchive(chatId: string): Promise<void>;
    toggleMute(chatId: string): Promise<void>;
    togglePin(chatId: string): Promise<void>;
    toggleVanishMode(chatId: string): Promise<void>;
    unblockUser(targetId: Principal): Promise<void>;
    unfollowUser(targetId: Principal): Promise<void>;
    updateGroupInfo(groupId: string, name: string, description: string): Promise<void>;
    updateLastSeen(): Promise<void>;
    updateOnlineStatus(status: boolean): Promise<void>;
}
