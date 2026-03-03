import List "mo:core/List";
import Array "mo:core/Array";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";

import AccessControl "authorization/access-control";

// Use migration with-clause

actor {
  include MixinStorage();

  // Initialize access control
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Types
  type UserId = Principal;
  type Timestamp = Int;
  type ChatId = Text;
  type MessageId = Text;
  type GroupId = Text;
  type ChannelId = Text;
  type StoryId = Text;
  type StatusId = Text;
  type MessageType = {
    #text;
    #image;
    #video;
    #voice;
    #file;
    #gif;
  };
  type NotificationType = {
    #message;
    #request;
    #reaction;
  };
  type MessageStatus = {
    #pending;
    #accepted;
    #declined;
  };

  type UserProfile = {
    username : Text;
    email : Text;
    profilePicture : Text;
    bio : Text;
    isPrivate : Bool;
    onlineStatus : Bool;
    lastSeen : Timestamp;
    blockedUsers : [UserId];
    followers : [UserId];
    following : [UserId];
    fcmToken : Text;
    createdAt : Timestamp;
    _id : UserId;
    fullName : Text;
    phoneNumber : Text;
    birthDate : Text;
    timezone : Text;
    websiteUrl : Text;
    closeFriends : [UserId];
  };

  module UserProfile {
    public func compareByUsername(a : UserProfile, b : UserProfile) : Order.Order {
      Text.compare(a.username, b.username);
    };

    public func compareByUsernamePrefixFirst(a : UserProfile, b : UserProfile, prefix : Text) : Order.Order {
      func getSortScore(profile : UserProfile) : Nat {
        if (profile.username.startsWith(#text prefix)) { 0 } else { 1 };
      };
      let aScore = getSortScore(a);
      let bScore = getSortScore(b);
      switch (Nat.compare(aScore, bScore)) {
        case (#equal) { compareByUsername(a, b) };
        case (order) { order };
      };
    };
  };

  type Chat = {
    participants : [UserId];
    createdAt : Timestamp;
    lastMessage : ?MessageId;
    lastUpdated : Timestamp;
    vanishMode : Bool;
    typing : [(Text, Bool)];
    pinned : [(Text, Bool)];
    archived : [(Text, Bool)];
    muted : [(Text, Bool)];
  };

  type GroupChat = {
    id : Text;
    name : Text;
    description : Text;
    adminId : UserId;
    members : [UserId];
    createdAt : Timestamp;
    lastMessage : ?Text;
    lastUpdated : Timestamp;
    typing : [(Text, Bool)];
    inviteLink : Text;
    slowMode : Nat;
  };

  type Channel = {
    id : ChannelId;
    name : Text;
    description : Text;
    rules : Text;
    adminId : UserId;
    subscribers : [UserId];
    createdAt : Timestamp;
    inviteLink : Text;
    slowModeSecs : Nat;
    pinnedMessageId : ?MessageId;
    isPublic : Bool;
  };

  type Story = {
    id : StoryId;
    authorId : UserId;
    text : Text;
    mediaUrl : Text;
    bgColor : Text;
    createdAt : Timestamp;
    expiresAt : Timestamp;
    views : [UserId];
    reactions : [(Text, [UserId])];
    isCloseFriends : Bool;
    isHighlight : Bool;
    highlightTitle : Text;
  };

  type Status = {
    id : StatusId;
    authorId : UserId;
    text : Text;
    bgColor : Text;
    photoUrl : Text;
    createdAt : Timestamp;
    expiresAt : Timestamp;
    views : [UserId];
    privacy : Text;
  };

  type Message = {
    senderId : UserId;
    text : Text;
    mediaUrl : Text;
    messageType : MessageType;
    createdAt : Timestamp;
    seenBy : [UserId];
    reactions : [(Text, [UserId])];
    edited : Bool;
    editedAt : ?Timestamp;
    deletedForEveryone : Bool;
    replyTo : ?MessageId;
    vanish : Bool;
  };

  type MessageRequest = {
    senderId : UserId;
    receiverId : UserId;
    chatId : ChatId;
    status : MessageStatus;
    createdAt : Timestamp;
  };

  type Notification = {
    _type : NotificationType;
    senderId : UserId;
    receiverId : UserId;
    chatId : ?ChatId;
    messageId : ?MessageId;
    read : Bool;
    createdAt : Timestamp;
  };

  let users = Map.empty<UserId, UserProfile>();
  let chats = Map.empty<ChatId, Chat>();
  let groupChats = Map.empty<GroupId, GroupChat>();
  let messages = Map.empty<MessageId, Message>();
  let groupMessages = Map.empty<MessageId, Message>();
  let messageRequests = Map.empty<Text, MessageRequest>();
  let notifications = Map.empty<Text, Notification>();
  let channels = Map.empty<ChannelId, Channel>();
  let channelMessages = Map.empty<MessageId, Message>();
  let stories = Map.empty<StoryId, Story>();
  let statuses = Map.empty<StatusId, Status>();

  let temporaryFolders = Map.empty<Principal, Map.Map<Text, Text>>();

  func isBlocked(userId : UserId, targetId : UserId) : Bool {
    switch (users.get(userId)) {
      case (null) { false };
      case (?profile) {
        profile.blockedUsers.find(func(id : UserId) : Bool { id == targetId }) != null;
      };
    };
  };

  func isBlockedByEither(user1 : UserId, user2 : UserId) : Bool {
    isBlocked(user1, user2) or isBlocked(user2, user1);
  };

  func isParticipant(chatId : ChatId, userId : UserId) : Bool {
    switch (chats.get(chatId)) {
      case (null) { false };
      case (?chat) {
        chat.participants.find(func(id : UserId) : Bool { id == userId }) != null;
      };
    };
  };

  func isGroupMember(groupId : GroupId, userId : UserId) : Bool {
    switch (groupChats.get(groupId)) {
      case (null) { false };
      case (?group) {
        group.members.find(func(id : UserId) : Bool { id == userId }) != null;
      };
    };
  };

  func isGroupAdmin(groupId : GroupId, userId : Principal) : Bool {
    switch (groupChats.get(groupId)) {
      case (null) { false };
      case (?group) { group.adminId == userId };
    };
  };

  func isChannelSubscriber(channelId : ChannelId, userId : UserId) : Bool {
    switch (channels.get(channelId)) {
      case (null) { false };
      case (?channel) {
        channel.subscribers.find(func(id : UserId) : Bool { id == userId }) != null;
      };
    };
  };

  func isChannelAdmin(channelId : ChannelId, userId : Principal) : Bool {
    switch (channels.get(channelId)) {
      case (null) { false };
      case (?channel) { channel.adminId == userId };
    };
  };

  func canViewProfile(caller : UserId, targetId : UserId) : Bool {
    if (caller == targetId) { return true };
    if (AccessControl.isAdmin(accessControlState, caller)) { return true };

    switch (users.get(targetId)) {
      case (null) { false };
      case (?profile) {
        if (isBlockedByEither(caller, targetId)) { return false };
        if (not profile.isPrivate) { return true };
        profile.followers.find(func(id : UserId) : Bool { id == caller }) != null;
      };
    };
  };

  func isFollowing(userId : UserId, targetId : UserId) : Bool {
    switch (users.get(userId)) {
      case (null) { false };
      case (?profile) {
        profile.following.find(func(id : UserId) : Bool { id == targetId }) != null;
      };
    };
  };

  func isCloseFriend(userId : UserId, targetId : UserId) : Bool {
    switch (users.get(userId)) {
      case (null) { false };
      case (?profile) {
        profile.closeFriends.find(func(id : UserId) : Bool { id == targetId }) != null;
      };
    };
  };

  func canViewStory(caller : UserId, story : Story) : Bool {
    if (caller == story.authorId) { return true };
    if (AccessControl.isAdmin(accessControlState, caller)) { return true };
    if (isBlockedByEither(caller, story.authorId)) { return false };
    
    if (story.isCloseFriends) {
      return isCloseFriend(story.authorId, caller);
    };
    
    return isFollowing(caller, story.authorId);
  };

  func canViewStatus(caller : UserId, status : Status) : Bool {
    if (caller == status.authorId) { return true };
    if (AccessControl.isAdmin(accessControlState, caller)) { return true };
    if (isBlockedByEither(caller, status.authorId)) { return false };
    
    switch (status.privacy) {
      case ("closefriends") { isCloseFriend(status.authorId, caller) };
      case ("followers") { isFollowing(caller, status.authorId) };
      case (_) { true }; // "everyone"
    };
  };

  // Required profile functions for frontend
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    users.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    let updatedProfile = {
      profile with
      _id = caller;
      createdAt = switch (users.get(caller)) {
        case (null) { Time.now() };
        case (?existing) { existing.createdAt };
      };
    };
    users.add(caller, updatedProfile);
  };

  public query ({ caller }) func getUserProfile(userId : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    if (not canViewProfile(caller, userId)) {
      return null;
    };
    users.get(userId);
  };

  public shared ({ caller }) func searchProfiles(searchText : Text) : async [UserProfile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search profiles");
    };

    let allUsers = users.values().toArray();

    let filteredUsers = allUsers.filter(
      func(profile) {
        profile.username.contains(#text searchText) and canViewProfile(caller, profile._id);
      }
    );

    let sortedUsers = filteredUsers.sort(
      func(a, b) { UserProfile.compareByUsernamePrefixFirst(a, b, searchText) }
    );

    sortedUsers;
  };

  public query ({ caller }) func getPersonalityTypes() : async [Text] {
    [
      "ISTJ (Logistician)",
      "ISFJ (Defender)",
      "INFJ (Advocate)",
      "INTJ (Architect)",
      "ISTP (Virtuoso)",
      "ISFP (Adventurer)",
      "INFP (Mediator)",
      "INTP (Logician)",
      "ESTP (Entrepreneur)",
      "ESFP (Entertainer)",
      "ENFP (Campaigner)",
      "ENTP (Debater)",
      "ESTJ (Executive)",
      "ESFJ (Consul)",
      "ENFJ (Protagonist)",
      "ENTJ (Commander)",
    ];
  };

  public query ({ caller }) func getLifestyleChoices() : async [Text] {
    [
      "Vegetarian",
      "Vegan",
      "Pescatarian",
      "Omnivore",
      "Active lifestyle",
      "Sedentary lifestyle",
      "Minimalist",
      "Eco-conscious",
    ];
  };

  public query ({ caller }) func getWellBeingPractices() : async [Text] {
    [
      "Yoga",
      "Meditation",
      "Mindfulness",
      "Journaling",
      "Nature walks",
      "Breathwork",
      "Aromatherapy",
    ];
  };

  public query ({ caller }) func getRelationshipStatuses() : async [Text] {
    [
      "Single",
      "In a relationship",
      "Married",
      "Divorced",
      "Widowed",
      "Open relationship",
      "Long-distance relationship",
    ];
  };

  public shared ({ caller }) func createTemporaryFolder(folderName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create folders");
    };

    let userFolders = switch (temporaryFolders.get(caller)) {
      case (null) {
        let newFolders = Map.empty<Text, Text>();
        temporaryFolders.add(caller, newFolders);
        newFolders;
      };
      case (?folders) { folders };
    };

    switch (userFolders.get(folderName)) {
      case (null) {
        userFolders.add(folderName, "empty");
      };
      case (_) { Runtime.trap("Folder already exists") };
    };
  };

  public query ({ caller }) func getTemporaryFolders() : async [Text] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access folders");
    };

    switch (temporaryFolders.get(caller)) {
      case (null) { [] };
      case (?folders) { folders.keys().toArray() };
    };
  };

  public query ({ caller }) func searchFolders(searchText : Text) : async [Text] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search folders");
    };

    switch (temporaryFolders.get(caller)) {
      case (null) { [] };
      case (?folders) {
        let allFolders = folders.keys().toArray();
        let filteredFolders = allFolders.filter(
          func(folderName) {
            folderName.contains(#text searchText);
          }
        );

        let prefixFolders = allFolders.filter(
          func(folderName) {
            folderName.startsWith(#text searchText);
          }
        );

        let suffixFolders = allFolders.filter(
          func(folderName) {
            not folderName.endsWith(#text searchText);
          }
        );

        [prefixFolders, filteredFolders, suffixFolders].flatten();
      };
    };
  };

  public shared ({ caller }) func deleteTemporaryFolder(folderName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete folders");
    };

    switch (temporaryFolders.get(caller)) {
      case (null) { Runtime.trap("No folders found for user") };
      case (?folders) {
        switch (folders.get(folderName)) {
          case (null) { Runtime.trap("Folder not found") };
          case (_) {
            folders.remove(folderName);
            if (folders.isEmpty()) {
              temporaryFolders.remove(caller);
            };
          };
        };
      };
    };
  };

  // USER MANAGEMENT

  public shared ({ caller }) func createOrUpdateUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create/update profiles");
    };

    let updatedProfile = {
      profile with
      _id = caller;
      createdAt = switch (users.get(caller)) {
        case (null) { Time.now() };
        case (?existing) { existing.createdAt };
      };
    };
    users.add(caller, updatedProfile);
  };

  public query ({ caller }) func searchUsersByUsername(searchText : Text) : async [UserProfile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search profiles");
    };

    let allUsers = users.values().toArray();

    let filteredUsers = allUsers.filter(
      func(profile) {
        profile.username.contains(#text searchText) and canViewProfile(caller, profile._id);
      }
    );

    let sortedUsers = filteredUsers.sort(
      func(a, b) { UserProfile.compareByUsernamePrefixFirst(a, b, searchText) }
    );

    sortedUsers;
  };

  public query ({ caller }) func searchUsersByUsernamePrefix(prefix : Text) : async [UserProfile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search profiles");
    };

    let allUsers = users.values().toArray();

    let filteredUsers = allUsers.filter(
      func(profile) {
        profile.username.startsWith(#text prefix) and canViewProfile(caller, profile._id);
      }
    );

    let sortedUsers = filteredUsers.sort(UserProfile.compareByUsername);

    sortedUsers;
  };

  public shared ({ caller }) func updateOnlineStatus(status : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update online status");
    };

    switch (users.get(caller)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?profile) {
        users.add(caller, { profile with onlineStatus = status });
      };
    };
  };

  public shared ({ caller }) func updateLastSeen() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update last seen");
    };

    switch (users.get(caller)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?profile) {
        users.add(caller, { profile with lastSeen = Time.now() });
      };
    };
  };

  public shared ({ caller }) func blockUser(targetId : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can block users");
    };

    if (caller == targetId) {
      Runtime.trap("Cannot block yourself");
    };

    switch (users.get(caller)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?profile) {
        let alreadyBlocked = profile.blockedUsers.find(func(id : UserId) : Bool { id == targetId }) != null;
        if (not alreadyBlocked) {
          let newBlockedUsers = profile.blockedUsers.concat([targetId]);
          users.add(caller, { profile with blockedUsers = newBlockedUsers });
        };
      };
    };
  };

  public shared ({ caller }) func unblockUser(targetId : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unblock users");
    };

    switch (users.get(caller)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?profile) {
        let newBlockedUsers = profile.blockedUsers.filter(func(id : UserId) : Bool { id != targetId });
        users.add(caller, { profile with blockedUsers = newBlockedUsers });
      };
    };
  };

  public shared ({ caller }) func followUser(targetId : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can follow users");
    };

    if (caller == targetId) {
      Runtime.trap("Cannot follow yourself");
    };

    if (isBlockedByEither(caller, targetId)) {
      Runtime.trap("Cannot follow blocked user");
    };

    switch (users.get(caller)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?callerProfile) {
        let alreadyFollowing = callerProfile.following.find(func(id : UserId) : Bool { id == targetId }) != null;
        if (not alreadyFollowing) {
          let newFollowing = callerProfile.following.concat([targetId]);
          users.add(caller, { callerProfile with following = newFollowing });

          switch (users.get(targetId)) {
            case (null) {};
            case (?targetProfile) {
              let newFollowers = targetProfile.followers.concat([caller]);
              users.add(targetId, { targetProfile with followers = newFollowers });
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func unfollowUser(targetId : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unfollow users");
    };

    switch (users.get(caller)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?callerProfile) {
        let newFollowing = callerProfile.following.filter(func(id : UserId) : Bool { id != targetId });
        users.add(caller, { callerProfile with following = newFollowing });

        switch (users.get(targetId)) {
          case (null) {};
          case (?targetProfile) {
            let newFollowers = targetProfile.followers.filter(func(id : UserId) : Bool { id != caller });
            users.add(targetId, { targetProfile with followers = newFollowers });
          };
        };
      };
    };
  };

  public shared ({ caller }) func deleteAccount() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete their account");
    };

    users.remove(caller);
    temporaryFolders.remove(caller);

    for ((userId, profile) in users.entries()) {
      let newFollowers = profile.followers.filter(func(id : UserId) : Bool { id != caller });
      let newFollowing = profile.following.filter(func(id : UserId) : Bool { id != caller });
      let newBlockedUsers = profile.blockedUsers.filter(func(id : UserId) : Bool { id != caller });
      let newCloseFriends = profile.closeFriends.filter(func(id : UserId) : Bool { id != caller });

      if (newFollowers.size() != profile.followers.size() or newFollowing.size() != profile.following.size() or newBlockedUsers.size() != profile.blockedUsers.size() or newCloseFriends.size() != profile.closeFriends.size()) {
        users.add(
          userId,
          {
            profile with
            followers = newFollowers;
            following = newFollowing;
            blockedUsers = newBlockedUsers;
            closeFriends = newCloseFriends;
          },
        );
      };
    };
  };

  // CHAT MANAGEMENT

  func generateChatId(user1 : Principal, user2 : Principal) : ChatId {
    let p1 = user1.toText();
    let p2 = user2.toText();
    if (p1 < p2) { p1 # "_" # p2 } else { p2 # "_" # p1 };
  };

  public shared ({ caller }) func getOrCreateChat(otherUser : Principal) : async Chat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create chats");
    };

    if (caller == otherUser) {
      Runtime.trap("Cannot create chat with yourself");
    };

    if (isBlockedByEither(caller, otherUser)) {
      Runtime.trap("Cannot create chat with blocked user");
    };

    let chatId = generateChatId(caller, otherUser);

    switch (chats.get(chatId)) {
      case (?existingChat) { existingChat };
      case (null) {
        let newChat : Chat = {
          participants = [caller, otherUser];
          createdAt = Time.now();
          lastMessage = null;
          lastUpdated = Time.now();
          vanishMode = false;
          typing = [];
          pinned = [];
          archived = [];
          muted = [];
        };
        chats.add(chatId, newChat);
        newChat;
      };
    };
  };

  public query ({ caller }) func getMyChats() : async [Chat] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view chats");
    };

    let allChats = chats.values().toArray();
    allChats.filter(func(chat : Chat) : Bool {
      chat.participants.find(func(id : UserId) : Bool { id == caller }) != null;
    });
  };

  public query ({ caller }) func getChatById(chatId : Text) : async ?Chat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view chats");
    };

    if (not isParticipant(chatId, caller)) {
      return null;
    };

    chats.get(chatId);
  };

  // MESSAGE MANAGEMENT

  func generateMessageId(chatId : ChatId, timestamp : Timestamp) : MessageId {
    chatId # "_" # Int.toText(timestamp);
  };

  // Individual chat
  public shared ({ caller }) func sendMessage(
    chatId : Text,
    text : Text,
    messageType : Text,
    mediaUrl : Text,
    replyTo : Text,
  ) : async Message {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };

    if (not isParticipant(chatId, caller)) {
      Runtime.trap("Unauthorized: You are not a participant in this chat");
    };

    // Check if blocked by other participant
    switch (chats.get(chatId)) {
      case (null) { Runtime.trap("Chat not found") };
      case (?chat) {
        for (participantId in chat.participants.vals()) {
          if (participantId != caller and isBlockedByEither(caller, participantId)) {
            Runtime.trap("Cannot send message to blocked user");
          };
        };
      };
    };

    let msgType : MessageType = switch (messageType) {
      case ("image") { #image };
      case ("video") { #video };
      case ("voice") { #voice };
      case ("file") { #file };
      case ("gif") { #gif };
      case (_) { #text };
    };

    let timestamp = Time.now();
    let messageId = generateMessageId(chatId, timestamp);

    let newMessage : Message = {
      senderId = caller;
      text = text;
      mediaUrl = mediaUrl;
      messageType = msgType;
      createdAt = timestamp;
      seenBy = [caller];
      reactions = [];
      edited = false;
      editedAt = null;
      deletedForEveryone = false;
      replyTo = if (replyTo == "") { null } else { ?replyTo };
      vanish = switch (chats.get(chatId)) {
        case (null) { false };
        case (?chat) { chat.vanishMode };
      };
    };

    messages.add(messageId, newMessage);

    switch (chats.get(chatId)) {
      case (null) {};
      case (?chat) {
        chats.add(
          chatId,
          {
            chat with
            lastMessage = ?messageId;
            lastUpdated = timestamp;
          },
        );
      };
    };

    newMessage;
  };

  public query ({ caller }) func getChatMessages(chatId : Text, afterTimestamp : Int) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view messages");
    };

    if (not isParticipant(chatId, caller)) {
      Runtime.trap("Unauthorized: You are not a participant in this chat");
    };

    let allMessages = messages.entries().toArray();
    let chatMessages = allMessages.filter(
      func((id, msg) : (MessageId, Message)) : Bool {
        id.startsWith(#text chatId) and msg.createdAt > afterTimestamp and not msg.deletedForEveryone;
      }
    );

    chatMessages.map(func((_, msg) : (MessageId, Message)) : Message { msg });
  };

  public shared ({ caller }) func markMessagesSeen(chatId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark messages as seen");
    };

    if (not isParticipant(chatId, caller)) {
      Runtime.trap("Unauthorized: You are not a participant in this chat");
    };

    for ((messageId, message) in messages.entries()) {
      if (messageId.startsWith(#text chatId)) {
        let alreadySeen = message.seenBy.find(func(id : UserId) : Bool { id == caller }) != null;
        if (not alreadySeen) {
          let newSeenBy = message.seenBy.concat([caller]);
          messages.add(messageId, { message with seenBy = newSeenBy });
        };
      };
    };
  };

  public shared ({ caller }) func editMessage(chatId : Text, messageId : Text, newText : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can edit messages");
    };

    if (not isParticipant(chatId, caller)) {
      Runtime.trap("Unauthorized: You are not a participant in this chat");
    };

    switch (messages.get(messageId)) {
      case (null) { Runtime.trap("Message not found") };
      case (?message) {
        if (message.senderId != caller) {
          Runtime.trap("Unauthorized: You can only edit your own messages");
        };

        if (message.deletedForEveryone) {
          Runtime.trap("Cannot edit deleted message");
        };

        messages.add(
          messageId,
          {
            message with
            text = newText;
            edited = true;
            editedAt = ?Time.now();
          },
        );
      };
    };
  };

  public shared ({ caller }) func deleteMessageForEveryone(chatId : Text, messageId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete messages");
    };

    if (not isParticipant(chatId, caller)) {
      Runtime.trap("Unauthorized: You are not a participant in this chat");
    };

    switch (messages.get(messageId)) {
      case (null) { Runtime.trap("Message not found") };
      case (?message) {
        if (message.senderId != caller) {
          Runtime.trap("Unauthorized: You can only delete your own messages");
        };

        messages.add(messageId, { message with deletedForEveryone = true });
      };
    };
  };

  public shared ({ caller }) func addReaction(chatId : Text, messageId : Text, emoji : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add reactions");
    };

    if (not isParticipant(chatId, caller)) {
      Runtime.trap("Unauthorized: You are not a participant in this chat");
    };

    switch (messages.get(messageId)) {
      case (null) { Runtime.trap("Message not found") };
      case (?message) {
        if (message.deletedForEveryone) {
          Runtime.trap("Cannot react to deleted message");
        };

        let newReactions = message.reactions.concat([(emoji, [caller])]);
        messages.add(messageId, { message with reactions = newReactions });
      };
    };
  };

  public shared ({ caller }) func removeReaction(chatId : Text, messageId : Text, emoji : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove reactions");
    };

    if (not isParticipant(chatId, caller)) {
      Runtime.trap("Unauthorized: You are not a participant in this chat");
    };

    switch (messages.get(messageId)) {
      case (null) { Runtime.trap("Message not found") };
      case (?message) {
        let newReactions = message.reactions.filter(
          func((e, users)) {
            if (e == emoji) {
              users.filter(func(id) { id != caller }).size() != 0;
            } else {
              true;
            };
          }
        );

        messages.add(messageId, { message with reactions = newReactions });
      };
    };
  };

  // TYPING STATUS

  public shared ({ caller }) func setTypingStatus(chatId : Text, isTyping : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set typing status");
    };

    if (not isParticipant(chatId, caller)) {
      Runtime.trap("Unauthorized: You are not a participant in this chat");
    };

    switch (chats.get(chatId)) {
      case (null) { Runtime.trap("Chat not found") };
      case (?chat) {
        let callerText = caller.toText();
        let newTyping = chat.typing.filter(func((userId, _) : (Text, Bool)) : Bool { userId != callerText });
        let updatedTyping = newTyping.concat([(callerText, isTyping)]);
        chats.add(chatId, { chat with typing = updatedTyping });
      };
    };
  };

  public query ({ caller }) func getTypingStatus(chatId : Text) : async [(Text, Bool)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view typing status");
    };

    if (not isParticipant(chatId, caller)) {
      Runtime.trap("Unauthorized: You are not a participant in this chat");
    };

    switch (chats.get(chatId)) {
      case (null) { [] };
      case (?chat) { chat.typing };
    };
  };

  // CHAT SETTINGS

  public shared ({ caller }) func togglePin(chatId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can pin chats");
    };

    if (not isParticipant(chatId, caller)) {
      Runtime.trap("Unauthorized: You are not a participant in this chat");
    };

    switch (chats.get(chatId)) {
      case (null) { Runtime.trap("Chat not found") };
      case (?chat) {
        let callerText = caller.toText();
        let currentStatus = switch (chat.pinned.find(func((userId, _) : (Text, Bool)) : Bool { userId == callerText })) {
          case (null) { false };
          case (?(_, status)) { status };
        };

        let newPinned = chat.pinned.filter(func((userId, _) : (Text, Bool)) : Bool { userId != callerText });
        let updatedPinned = newPinned.concat([(callerText, not currentStatus)]);
        chats.add(chatId, { chat with pinned = updatedPinned });
      };
    };
  };

  public shared ({ caller }) func toggleArchive(chatId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can archive chats");
    };

    if (not isParticipant(chatId, caller)) {
      Runtime.trap("Unauthorized: You are not a participant in this chat");
    };

    switch (chats.get(chatId)) {
      case (null) { Runtime.trap("Chat not found") };
      case (?chat) {
        let callerText = caller.toText();
        let currentStatus = switch (chat.archived.find(func((userId, _) : (Text, Bool)) : Bool { userId == callerText })) {
          case (null) { false };
          case (?(_, status)) { status };
        };

        let newArchived = chat.archived.filter(func((userId, _) : (Text, Bool)) : Bool { userId != callerText });
        let updatedArchived = newArchived.concat([(callerText, not currentStatus)]);
        chats.add(chatId, { chat with archived = updatedArchived });
      };
    };
  };

  public shared ({ caller }) func toggleMute(chatId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mute chats");
    };

    if (not isParticipant(chatId, caller)) {
      Runtime.trap("Unauthorized: You are not a participant in this chat");
    };

    switch (chats.get(chatId)) {
      case (null) { Runtime.trap("Chat not found") };
      case (?chat) {
        let callerText = caller.toText();
        let currentStatus = switch (chat.muted.find(func((userId, _) : (Text, Bool)) : Bool { userId == callerText })) {
          case (null) { false };
          case (?(_, status)) { status };
        };

        let newMuted = chat.muted.filter(func((userId, _) : (Text, Bool)) : Bool { userId != callerText });
        let updatedMuted = newMuted.concat([(callerText, not currentStatus)]);
        chats.add(chatId, { chat with muted = updatedMuted });
      };
    };
  };

  public shared ({ caller }) func toggleVanishMode(chatId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can toggle vanish mode");
    };

    if (not isParticipant(chatId, caller)) {
      Runtime.trap("Unauthorized: You are not a participant in this chat");
    };

    switch (chats.get(chatId)) {
      case (null) { Runtime.trap("Chat not found") };
      case (?chat) {
        chats.add(chatId, { chat with vanishMode = not chat.vanishMode });
      };
    };
  };

  // GROUP CHAT MANAGEMENT

  public shared ({ caller }) func createGroupChat(
    name : Text,
    description : Text,
    memberIds : [Principal],
  ) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create group chats");
    };

    if (name.trim(#char ' ').size() == 0) {
      Runtime.trap("Group name cannot be empty");
    };

    let groupId = name # Time.now().toText();

    let filteredMembers = memberIds.filter(func(id) { id != caller });

    let newGroup : GroupChat = {
      id = groupId;
      name;
      description;
      adminId = caller;
      members = [caller].concat(filteredMembers);
      createdAt = Time.now();
      lastMessage = null;
      lastUpdated = Time.now();
      typing = [];
      inviteLink = "";
      slowMode = 0;
    };

    groupChats.add(groupId, newGroup);
    groupId;
  };

  public query ({ caller }) func getMyGroupChats() : async [GroupChat] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view group chats");
    };

    groupChats.values().toArray().filter(func(group) { isGroupMember(group.id, caller) });
  };

  public query ({ caller }) func getGroupById(groupId : Text) : async ?GroupChat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view group details");
    };

    if (not isGroupMember(groupId, caller)) {
      return null;
    };

    groupChats.get(groupId);
  };

  public shared ({ caller }) func sendGroupMessage(
    groupId : Text,
    text : Text,
    messageType : Text,
    mediaUrl : Text,
    replyTo : Text,
  ) : async Message {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send group messages");
    };

    if (not isGroupMember(groupId, caller)) {
      Runtime.trap("Unauthorized: You are not a member of this group");
    };

    let msgType : MessageType = switch (messageType) {
      case ("image") { #image };
      case ("video") { #video };
      case ("voice") { #voice };
      case ("file") { #file };
      case ("gif") { #gif };
      case (_) { #text };
    };

    let timestamp = Time.now();
    let messageId = groupId # "_" # Int.toText(timestamp);

    let newMessage : Message = {
      senderId = caller;
      text = text;
      mediaUrl = mediaUrl;
      messageType = msgType;
      createdAt = timestamp;
      seenBy = [caller];
      reactions = [];
      edited = false;
      editedAt = null;
      deletedForEveryone = false;
      replyTo = if (replyTo == "") { null } else { ?replyTo };
      vanish = false;
    };

    groupMessages.add(messageId, newMessage);

    switch (groupChats.get(groupId)) {
      case (null) {};
      case (?group) {
        groupChats.add(
          groupId,
          {
            group with
            lastMessage = ?text;
            lastUpdated = timestamp;
          },
        );
      };
    };

    newMessage;
  };

  public query ({ caller }) func getGroupMessages(groupId : Text, afterTimestamp : Int) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view group messages");
    };

    if (not isGroupMember(groupId, caller)) {
      Runtime.trap("Unauthorized: You are not a member of this group");
    };

    let allMessages = groupMessages.entries().toArray();
    let groupMsgs = allMessages.filter(
      func((id, msg)) {
        id.startsWith(#text groupId) and msg.createdAt > afterTimestamp and not msg.deletedForEveryone;
      }
    );

    groupMsgs.map(func((_, msg)) { msg });
  };

  public shared ({ caller }) func markGroupMessagesSeen(groupId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark group messages as seen");
    };

    if (not isGroupMember(groupId, caller)) {
      Runtime.trap("Unauthorized: You are not a member of this group");
    };

    for ((messageId, message) in groupMessages.entries()) {
      if (messageId.startsWith(#text groupId)) {
        let alreadySeen = message.seenBy.find(func(id : UserId) : Bool { id == caller }) != null;
        if (not alreadySeen) {
          let newSeenBy = message.seenBy.concat([caller]);
          groupMessages.add(messageId, { message with seenBy = newSeenBy });
        };
      };
    };
  };

  public shared ({ caller }) func addGroupMember(groupId : Text, userId : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add group members");
    };

    if (not isGroupAdmin(groupId, caller)) {
      Runtime.trap("Unauthorized: Only group admins can add members");
    };

    switch (groupChats.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        let alreadyMember = group.members.find(func(id : UserId) : Bool { id == userId }) != null;
        if (not alreadyMember) {
          let newMembers = group.members.concat([userId]);
          groupChats.add(groupId, { group with members = newMembers });
        };
      };
    };
  };

  public shared ({ caller }) func removeGroupMember(groupId : Text, userId : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove group members");
    };

    if (not isGroupAdmin(groupId, caller)) {
      Runtime.trap("Unauthorized: Only group admins can remove members");
    };

    switch (groupChats.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        if (userId == group.adminId and group.members.size() > 1) {
          Runtime.trap("Cannot remove the admin from the group");
        };

        let newMembers = group.members.filter(func(id) { id != userId });
        groupChats.add(groupId, { group with members = newMembers });
      };
    };
  };

  public shared ({ caller }) func leaveGroup(groupId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can leave groups");
    };

    if (not isGroupMember(groupId, caller)) {
      Runtime.trap("You are not a member of this group");
    };

    switch (groupChats.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        if (caller == group.adminId and group.members.size() > 1) {
          Runtime.trap("Admin cannot leave the group while other members remain");
        };

        let newMembers = group.members.filter(func(id) { id != caller });
        groupChats.add(groupId, { group with members = newMembers });
      };
    };
  };

  public shared ({ caller }) func updateGroupInfo(
    groupId : Text,
    name : Text,
    description : Text,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update group info");
    };

    if (not isGroupAdmin(groupId, caller)) {
      Runtime.trap("Unauthorized: Only group admins can update group info");
    };

    switch (groupChats.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        groupChats.add(groupId, { group with name; description });
      };
    };
  };

  public shared ({ caller }) func setGroupTypingStatus(groupId : Text, isTyping : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set group typing status");
    };

    if (not isGroupMember(groupId, caller)) {
      Runtime.trap("Unauthorized: You are not a member of this group");
    };

    switch (groupChats.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        let callerText = caller.toText();
        let newTyping = group.typing.filter(func((userId, _) : (Text, Bool)) : Bool { userId != callerText });
        let updatedTyping = newTyping.concat([(callerText, isTyping)]);
        groupChats.add(groupId, { group with typing = updatedTyping });
      };
    };
  };

  // GROUP INVITE LINK FUNCTIONS

  public shared ({ caller }) func generateGroupInviteLink(groupId : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can generate invite links");
    };

    if (not isGroupAdmin(groupId, caller)) {
      Runtime.trap("Unauthorized: Only group admins can generate invite links");
    };

    switch (groupChats.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        let inviteLink = "group_invite_" # groupId # "_" # Int.toText(Time.now());
        groupChats.add(groupId, { group with inviteLink });
        inviteLink;
      };
    };
  };

  public shared ({ caller }) func joinGroupByInviteLink(inviteLink : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can join groups");
    };

    var foundGroup : ?GroupChat = null;
    for ((groupId, group) in groupChats.entries()) {
      if (group.inviteLink == inviteLink) {
        foundGroup := ?group;
      };
    };

    switch (foundGroup) {
      case (null) { Runtime.trap("Invalid invite link") };
      case (?group) {
        let alreadyMember = group.members.find(func(id) { id == caller }) != null;
        if (not alreadyMember) {
          let newMembers = group.members.concat([caller]);
          groupChats.add(group.id, { group with members = newMembers });
        };
      };
    };
  };

  public shared ({ caller }) func setGroupSlowMode(groupId : Text, slowModeSecs : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set slow mode");
    };

    if (not isGroupAdmin(groupId, caller)) {
      Runtime.trap("Unauthorized: Only group admins can set slow mode");
    };

    switch (groupChats.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        groupChats.add(groupId, { group with slowMode = slowModeSecs });
      };
    };
  };

  // CHANNEL FUNCTIONS

  public shared ({ caller }) func createChannel(name : Text, description : Text, rules : Text, isPublic : Bool) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create channels");
    };

    let channelId = Time.now().toText();

    let newChannel : Channel = {
      id = channelId;
      name;
      description;
      rules;
      adminId = caller;
      subscribers = [caller];
      createdAt = Time.now();
      inviteLink = "";
      slowModeSecs = 0;
      pinnedMessageId = null;
      isPublic;
    };

    channels.add(channelId, newChannel);
    channelId;
  };

  public query ({ caller }) func getChannels() : async [Channel] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view channels");
    };

    channels.values().toArray().filter(func(channel) { channel.isPublic });
  };

  public query ({ caller }) func getMyChannels() : async [Channel] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view channels");
    };

    channels.values().toArray().filter(func(channel) { 
      channel.subscribers.find(func(id) { id == caller }) != null or channel.adminId == caller
    });
  };

  public query ({ caller }) func getChannelById(channelId : Text) : async ?Channel {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view channels");
    };

    switch (channels.get(channelId)) {
      case (null) { null };
      case (?channel) {
        if (channel.isPublic or isChannelSubscriber(channelId, caller) or channel.adminId == caller) {
          ?channel;
        } else {
          null;
        };
      };
    };
  };

  public shared ({ caller }) func joinChannel(channelId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can join channels");
    };

    switch (channels.get(channelId)) {
      case (null) { Runtime.trap("Channel not found") };
      case (?channel) {
        if (not channel.isPublic and channel.adminId != caller) {
          Runtime.trap("Cannot join private channel without invite");
        };
        
        if (channel.subscribers.find(func(id) { id == caller }) == null) {
          let newSubscribers = channel.subscribers.concat([caller]);
          channels.add(channelId, { channel with subscribers = newSubscribers });
        };
      };
    };
  };

  public shared ({ caller }) func leaveChannel(channelId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can leave channels");
    };

    switch (channels.get(channelId)) {
      case (null) { Runtime.trap("Channel not found") };
      case (?channel) {
        if (caller == channel.adminId) {
          Runtime.trap("Channel admin cannot leave the channel");
        };
        
        channels.add(channelId, {
          channel with
          subscribers = channel.subscribers.filter(func(id) { id != caller })
        });
      };
    };
  };

  public shared ({ caller }) func postToChannel(
    channelId : Text,
    text : Text,
    mediaUrl : Text,
    messageType : Text,
  ) : async Message {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can post to channels");
    };

    if (not isChannelAdmin(channelId, caller)) {
      Runtime.trap("Unauthorized: Only channel admins can post messages");
    };

    let msgType : MessageType = switch (messageType) {
      case ("image") { #image };
      case ("video") { #video };
      case ("voice") { #voice };
      case ("file") { #file };
      case ("gif") { #gif };
      case (_) { #text };
    };

    let timestamp = Time.now();
    let messageId = channelId # "_" # Int.toText(timestamp);

    let newMessage : Message = {
      senderId = caller;
      text = text;
      mediaUrl = mediaUrl;
      messageType = msgType;
      createdAt = timestamp;
      seenBy = [caller];
      reactions = [];
      edited = false;
      editedAt = null;
      deletedForEveryone = false;
      replyTo = null;
      vanish = false;
    };

    channelMessages.add(messageId, newMessage);
    newMessage;
  };

  public query ({ caller }) func getChannelMessages(channelId : Text, afterTimestamp : Int) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view channel messages");
    };

    switch (channels.get(channelId)) {
      case (null) { Runtime.trap("Channel not found") };
      case (?channel) {
        if (not channel.isPublic and not isChannelSubscriber(channelId, caller) and channel.adminId != caller) {
          Runtime.trap("Unauthorized: You must be a subscriber to view messages");
        };
      };
    };

    let allMessages = channelMessages.entries().toArray();
    let msgs = allMessages.filter(
      func((id, msg)) {
        id.startsWith(#text channelId) and msg.createdAt > afterTimestamp and not msg.deletedForEveryone;
      }
    );

    msgs.map(func((_, msg)) { msg });
  };

  public shared ({ caller }) func generateChannelInviteLink(channelId : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can generate invite links");
    };

    if (not isChannelAdmin(channelId, caller)) {
      Runtime.trap("Unauthorized: Only channel admins can generate invite links");
    };

    switch (channels.get(channelId)) {
      case (null) { Runtime.trap("Channel not found") };
      case (?channel) {
        let inviteLink = "channel_invite_" # channelId # "_" # Int.toText(Time.now());
        channels.add(channelId, { channel with inviteLink });
        inviteLink;
      };
    };
  };

  public shared ({ caller }) func joinChannelByInviteLink(inviteLink : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can join channels");
    };

    var foundChannel : ?Channel = null;
    for ((channelId, channel) in channels.entries()) {
      if (channel.inviteLink == inviteLink) {
        foundChannel := ?channel;
      };
    };

    switch (foundChannel) {
      case (null) { Runtime.trap("Invalid invite link") };
      case (?channel) {
        let alreadySubscriber = channel.subscribers.find(func(id) { id == caller }) != null;
        if (not alreadySubscriber) {
          let newSubscribers = channel.subscribers.concat([caller]);
          channels.add(channel.id, { channel with subscribers = newSubscribers });
        };
      };
    };
  };

  public shared ({ caller }) func pinMessageInChannel(channelId : Text, messageId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can pin messages");
    };

    if (not isChannelAdmin(channelId, caller)) {
      Runtime.trap("Unauthorized: Only channel admins can pin messages");
    };

    switch (channels.get(channelId)) {
      case (null) { Runtime.trap("Channel not found") };
      case (?channel) {
        channels.add(channelId, { channel with pinnedMessageId = ?messageId });
      };
    };
  };

  public shared ({ caller }) func updateChannelInfo(
    channelId : Text,
    name : Text,
    description : Text,
    rules : Text,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update channel info");
    };

    if (not isChannelAdmin(channelId, caller)) {
      Runtime.trap("Unauthorized: Only channel admins can update channel info");
    };

    switch (channels.get(channelId)) {
      case (null) { Runtime.trap("Channel not found") };
      case (?channel) {
        channels.add(channelId, { channel with name; description; rules });
      };
    };
  };

  // STORY FUNCTIONS

  public shared ({ caller }) func createStory(
    text : Text,
    mediaUrl : Text,
    bgColor : Text,
    isCloseFriends : Bool,
  ) : async Story {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create stories");
    };

    let storyId = caller.toText() # "_" # Int.toText(Time.now());
    let now = Time.now();
    let expiresAt = now + (24 * 60 * 60 * 1_000_000_000); // 24 hours in nanoseconds

    let newStory : Story = {
      id = storyId;
      authorId = caller;
      text;
      mediaUrl;
      bgColor;
      createdAt = now;
      expiresAt;
      views = [];
      reactions = [];
      isCloseFriends;
      isHighlight = false;
      highlightTitle = "";
    };

    stories.add(storyId, newStory);
    newStory;
  };

  public query ({ caller }) func getStoriesForFeed() : async [(Principal, [Story])] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stories");
    };

    let now = Time.now();
    let allStories = stories.values().toArray();
    
    let validStories = allStories.filter(func(story) {
      story.createdAt <= now and story.expiresAt > now and not story.isHighlight and canViewStory(caller, story)
    });

    let grouped = Map.empty<Principal, [Story]>();
    for (story in validStories.vals()) {
      let existing = switch (grouped.get(story.authorId)) {
        case (null) { [] };
        case (?arr) { arr };
      };
      grouped.add(story.authorId, existing.concat([story]));
    };

    grouped.entries().toArray();
  };

  public query ({ caller }) func getStoriesByUser(userId : Principal) : async [Story] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stories");
    };

    let now = Time.now();
    let allStories = stories.values().toArray();
    
    allStories.filter(func(story) {
      story.authorId == userId and story.createdAt <= now and story.expiresAt > now and not story.isHighlight and canViewStory(caller, story)
    });
  };

  public query ({ caller }) func getMyStories() : async [Story] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stories");
    };

    let now = Time.now();
    let allStories = stories.values().toArray();
    
    allStories.filter(func(story) {
      story.authorId == caller and story.createdAt <= now and story.expiresAt > now and not story.isHighlight
    });
  };

  public shared ({ caller }) func markStoryViewed(storyId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stories");
    };

    switch (stories.get(storyId)) {
      case (null) { Runtime.trap("Story not found") };
      case (?story) {
        if (not canViewStory(caller, story)) {
          Runtime.trap("Unauthorized: You cannot view this story");
        };

        let alreadyViewed = story.views.find(func(id) { id == caller }) != null;
        if (not alreadyViewed) {
          let newViews = story.views.concat([caller]);
          stories.add(storyId, { story with views = newViews });
        };
      };
    };
  };

  public shared ({ caller }) func reactToStory(storyId : Text, emoji : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can react to stories");
    };

    switch (stories.get(storyId)) {
      case (null) { Runtime.trap("Story not found") };
      case (?story) {
        if (not canViewStory(caller, story)) {
          Runtime.trap("Unauthorized: You cannot react to this story");
        };

        let newReactions = story.reactions.concat([(emoji, [caller])]);
        stories.add(storyId, { story with reactions = newReactions });
      };
    };
  };

  public shared ({ caller }) func deleteStory(storyId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete stories");
    };

    switch (stories.get(storyId)) {
      case (null) { Runtime.trap("Story not found") };
      case (?story) {
        if (story.authorId != caller) {
          Runtime.trap("Unauthorized: You can only delete your own stories");
        };

        stories.remove(storyId);
      };
    };
  };

  public shared ({ caller }) func addToHighlights(storyId : Text, highlightTitle : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add stories to highlights");
    };

    switch (stories.get(storyId)) {
      case (null) { Runtime.trap("Story not found") };
      case (?story) {
        if (story.authorId != caller) {
          Runtime.trap("Unauthorized: You can only highlight your own stories");
        };

        stories.add(storyId, { 
          story with 
          isHighlight = true;
          highlightTitle;
        });
      };
    };
  };

  public query ({ caller }) func getHighlights(userId : Principal) : async [Story] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view highlights");
    };

    let allStories = stories.values().toArray();
    
    allStories.filter(func(story) {
      story.authorId == userId and story.isHighlight and canViewStory(caller, story)
    });
  };

  // STATUS FUNCTIONS (WhatsApp-style)

  public shared ({ caller }) func createStatus(
    text : Text,
    bgColor : Text,
    photoUrl : Text,
    privacy : Text,
  ) : async Status {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create statuses");
    };

    let statusId = caller.toText() # "_status_" # Int.toText(Time.now());
    let now = Time.now();
    let expiresAt = now + (24 * 60 * 60 * 1_000_000_000); // 24 hours

    let newStatus : Status = {
      id = statusId;
      authorId = caller;
      text;
      bgColor;
      photoUrl;
      createdAt = now;
      expiresAt;
      views = [];
      privacy;
    };

    statuses.add(statusId, newStatus);
    newStatus;
  };

  public query ({ caller }) func getStatusFeed() : async [Status] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view statuses");
    };

    let now = Time.now();
    let allStatuses = statuses.values().toArray();
    
    allStatuses.filter(func(status) {
      status.createdAt <= now and status.expiresAt > now and canViewStatus(caller, status)
    });
  };

  public query ({ caller }) func getMyStatuses() : async [Status] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view statuses");
    };

    let now = Time.now();
    let allStatuses = statuses.values().toArray();
    
    allStatuses.filter(func(status) {
      status.authorId == caller and status.createdAt <= now and status.expiresAt > now
    });
  };

  public shared ({ caller }) func markStatusViewed(statusId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view statuses");
    };

    switch (statuses.get(statusId)) {
      case (null) { Runtime.trap("Status not found") };
      case (?status) {
        if (not canViewStatus(caller, status)) {
          Runtime.trap("Unauthorized: You cannot view this status");
        };

        let alreadyViewed = status.views.find(func(id) { id == caller }) != null;
        if (not alreadyViewed) {
          let newViews = status.views.concat([caller]);
          statuses.add(statusId, { status with views = newViews });
        };
      };
    };
  };

  public shared ({ caller }) func deleteStatus(statusId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete statuses");
    };

    switch (statuses.get(statusId)) {
      case (null) { Runtime.trap("Status not found") };
      case (?status) {
        if (status.authorId != caller) {
          Runtime.trap("Unauthorized: You can only delete your own statuses");
        };

        statuses.remove(statusId);
      };
    };
  };

  // CLOSE FRIENDS FUNCTIONS

  public shared ({ caller }) func addCloseFriend(userId : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add close friends");
    };

    if (caller == userId) {
      Runtime.trap("Cannot add yourself as close friend");
    };

    switch (users.get(caller)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?profile) {
        let alreadyCloseFriend = profile.closeFriends.find(func(id) { id == userId }) != null;
        if (not alreadyCloseFriend) {
          let newCloseFriends = profile.closeFriends.concat([userId]);
          users.add(caller, { profile with closeFriends = newCloseFriends });
        };
      };
    };
  };

  public shared ({ caller }) func removeCloseFriend(userId : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove close friends");
    };

    switch (users.get(caller)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?profile) {
        let newCloseFriends = profile.closeFriends.filter(func(id) { id != userId });
        users.add(caller, { profile with closeFriends = newCloseFriends });
      };
    };
  };

  public query ({ caller }) func getCloseFriends() : async [UserProfile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view close friends");
    };

    switch (users.get(caller)) {
      case (null) { [] };
      case (?profile) {
        profile.closeFriends.map(func(userId) {
          switch (users.get(userId)) {
            case (null) { null };
            case (?friendProfile) { ?friendProfile };
          };
        }).filter(func(opt) { opt != null }).map(func(opt) {
          switch (opt) {
            case (null) { Runtime.trap("Unexpected null") };
            case (?p) { p };
          };
        });
      };
    };
  };

  // HTTP Outcall placeholder for fetching emails by phone number
  public query ({ caller }) func getEmailByPhoneNumber(_phoneNumber : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access this feature");
    };
    Runtime.trap("This feature is currently unsupported as Motoko does not support HTTP outcalls yet. Implement in TypeScript.");
  };
};
