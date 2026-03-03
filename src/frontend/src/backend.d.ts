import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Timestamp = bigint;
export type ChannelId = string;
export interface Story {
    id: StoryId;
    highlightTitle: string;
    expiresAt: Timestamp;
    isCloseFriends: boolean;
    views: Array<UserId>;
    authorId: UserId;
    createdAt: Timestamp;
    text: string;
    mediaUrl: string;
    isHighlight: boolean;
    reactions: Array<[string, Array<UserId>]>;
    bgColor: string;
}
export type StoryId = string;
export interface Channel {
    id: ChannelId;
    name: string;
    createdAt: Timestamp;
    description: string;
    subscribers: Array<UserId>;
    inviteLink: string;
    isPublic: boolean;
    adminId: UserId;
    slowModeSecs: bigint;
    rules: string;
    pinnedMessageId?: MessageId;
}
export type StatusId = string;
export type UserId = Principal;
export interface GroupChat {
    id: string;
    members: Array<UserId>;
    name: string;
    createdAt: Timestamp;
    lastMessage?: string;
    lastUpdated: Timestamp;
    slowMode: bigint;
    typing: Array<[string, boolean]>;
    description: string;
    inviteLink: string;
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
export interface Status {
    id: StatusId;
    expiresAt: Timestamp;
    views: Array<UserId>;
    authorId: UserId;
    createdAt: Timestamp;
    text: string;
    photoUrl: string;
    privacy: string;
    bgColor: string;
}
export interface UserProfile {
    _id: UserId;
    bio: string;
    blockedUsers: Array<UserId>;
    timezone: string;
    fcmToken: string;
    username: string;
    closeFriends: Array<UserId>;
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
    addCloseFriend(userId: Principal): Promise<void>;
    addGroupMember(groupId: string, userId: Principal): Promise<void>;
    addReaction(chatId: string, messageId: string, emoji: string): Promise<void>;
    addToHighlights(storyId: string, highlightTitle: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    blockUser(targetId: Principal): Promise<void>;
    createChannel(name: string, description: string, rules: string, isPublic: boolean): Promise<string>;
    createGroupChat(name: string, description: string, memberIds: Array<Principal>): Promise<string>;
    createOrUpdateUserProfile(profile: UserProfile): Promise<void>;
    createStatus(text: string, bgColor: string, photoUrl: string, privacy: string): Promise<Status>;
    createStory(text: string, mediaUrl: string, bgColor: string, isCloseFriends: boolean): Promise<Story>;
    createTemporaryFolder(folderName: string): Promise<void>;
    deleteAccount(): Promise<void>;
    deleteMessageForEveryone(chatId: string, messageId: string): Promise<void>;
    deleteStatus(statusId: string): Promise<void>;
    deleteStory(storyId: string): Promise<void>;
    deleteTemporaryFolder(folderName: string): Promise<void>;
    editMessage(chatId: string, messageId: string, newText: string): Promise<void>;
    followUser(targetId: Principal): Promise<void>;
    generateChannelInviteLink(channelId: string): Promise<string>;
    generateGroupInviteLink(groupId: string): Promise<string>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChannelById(channelId: string): Promise<Channel | null>;
    getChannelMessages(channelId: string, afterTimestamp: bigint): Promise<Array<Message>>;
    getChannels(): Promise<Array<Channel>>;
    getChatById(chatId: string): Promise<Chat | null>;
    getChatMessages(chatId: string, afterTimestamp: bigint): Promise<Array<Message>>;
    getCloseFriends(): Promise<Array<UserProfile>>;
    getEmailByPhoneNumber(_phoneNumber: string): Promise<string>;
    getGroupById(groupId: string): Promise<GroupChat | null>;
    getGroupMessages(groupId: string, afterTimestamp: bigint): Promise<Array<Message>>;
    getHighlights(userId: Principal): Promise<Array<Story>>;
    getLifestyleChoices(): Promise<Array<string>>;
    getMyChannels(): Promise<Array<Channel>>;
    getMyChats(): Promise<Array<Chat>>;
    getMyGroupChats(): Promise<Array<GroupChat>>;
    getMyStatuses(): Promise<Array<Status>>;
    getMyStories(): Promise<Array<Story>>;
    getOrCreateChat(otherUser: Principal): Promise<Chat>;
    getPersonalityTypes(): Promise<Array<string>>;
    getRelationshipStatuses(): Promise<Array<string>>;
    getStatusFeed(): Promise<Array<Status>>;
    getStoriesByUser(userId: Principal): Promise<Array<Story>>;
    getStoriesForFeed(): Promise<Array<[Principal, Array<Story>]>>;
    getTemporaryFolders(): Promise<Array<string>>;
    getTypingStatus(chatId: string): Promise<Array<[string, boolean]>>;
    getUserProfile(userId: Principal): Promise<UserProfile | null>;
    getWellBeingPractices(): Promise<Array<string>>;
    isCallerAdmin(): Promise<boolean>;
    joinChannel(channelId: string): Promise<void>;
    joinChannelByInviteLink(inviteLink: string): Promise<void>;
    joinGroupByInviteLink(inviteLink: string): Promise<void>;
    leaveChannel(channelId: string): Promise<void>;
    leaveGroup(groupId: string): Promise<void>;
    markGroupMessagesSeen(groupId: string): Promise<void>;
    markMessagesSeen(chatId: string): Promise<void>;
    markStatusViewed(statusId: string): Promise<void>;
    markStoryViewed(storyId: string): Promise<void>;
    pinMessageInChannel(channelId: string, messageId: string): Promise<void>;
    postToChannel(channelId: string, text: string, mediaUrl: string, messageType: string): Promise<Message>;
    reactToStory(storyId: string, emoji: string): Promise<void>;
    removeCloseFriend(userId: Principal): Promise<void>;
    removeGroupMember(groupId: string, userId: Principal): Promise<void>;
    removeReaction(chatId: string, messageId: string, emoji: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchFolders(searchText: string): Promise<Array<string>>;
    searchProfiles(searchText: string): Promise<Array<UserProfile>>;
    searchUsersByUsername(searchText: string): Promise<Array<UserProfile>>;
    searchUsersByUsernamePrefix(prefix: string): Promise<Array<UserProfile>>;
    sendGroupMessage(groupId: string, text: string, messageType: string, mediaUrl: string, replyTo: string): Promise<Message>;
    sendMessage(chatId: string, text: string, messageType: string, mediaUrl: string, replyTo: string): Promise<Message>;
    setGroupSlowMode(groupId: string, slowModeSecs: bigint): Promise<void>;
    setGroupTypingStatus(groupId: string, isTyping: boolean): Promise<void>;
    setTypingStatus(chatId: string, isTyping: boolean): Promise<void>;
    toggleArchive(chatId: string): Promise<void>;
    toggleMute(chatId: string): Promise<void>;
    togglePin(chatId: string): Promise<void>;
    toggleVanishMode(chatId: string): Promise<void>;
    unblockUser(targetId: Principal): Promise<void>;
    unfollowUser(targetId: Principal): Promise<void>;
    updateChannelInfo(channelId: string, name: string, description: string, rules: string): Promise<void>;
    updateGroupInfo(groupId: string, name: string, description: string): Promise<void>;
    updateLastSeen(): Promise<void>;
    updateOnlineStatus(status: boolean): Promise<void>;
}
