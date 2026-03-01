import List "mo:core/List";
import Array "mo:core/Array";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Set "mo:core/Set";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";



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
  let messages = Map.empty<MessageId, Message>();
  let messageRequests = Map.empty<Text, MessageRequest>();
  let notifications = Map.empty<Text, Notification>();

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

  public query ({ caller }) func getUserProfile(userId : Principal) : async ?UserProfile {
    if (not canViewProfile(caller, userId)) {
      return null; // Don't reveal existence of private/blocked profiles
    };
    users.get(userId);
  };

  public query ({ caller }) func searchUsersByUsername(searchText : Text) : async [UserProfile] {
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

          // Add caller to target's followers
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

        // Remove caller from target's followers
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

    // Clean up user from followers/following lists
    for ((userId, profile) in users.entries()) {
      let newFollowers = profile.followers.filter(func(id : UserId) : Bool { id != caller });
      let newFollowing = profile.following.filter(func(id : UserId) : Bool { id != caller });
      let newBlockedUsers = profile.blockedUsers.filter(func(id : UserId) : Bool { id != caller });

      if (newFollowers.size() != profile.followers.size() or newFollowing.size() != profile.following.size() or newBlockedUsers.size() != profile.blockedUsers.size()) {
        users.add(
          userId,
          {
            profile with
            followers = newFollowers;
            following = newFollowing;
            blockedUsers = newBlockedUsers;
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
      return null; // Don't reveal existence of chats user is not part of
    };

    chats.get(chatId);
  };

  // MESSAGE MANAGEMENT

  func generateMessageId(chatId : ChatId, timestamp : Timestamp) : MessageId {
    chatId # "_" # Int.toText(timestamp);
  };

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

    // Update chat's last message
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

        let existingReaction = message.reactions.find(
          func((e, _) : (Text, [UserId])) : Bool { e == emoji }
        );

        let newReactions = switch (existingReaction) {
          case (null) {
            message.reactions.concat([(emoji, [caller])]);
          };
          case (?(_, users)) {
            let alreadyReacted = users.find(func(id : UserId) : Bool { id == caller }) != null;
            if (alreadyReacted) {
              let newUsers = users.filter(func(id : UserId) : Bool { id != caller });
              if (newUsers.size() == 0) {
                message.reactions.filter(func((e, _) : (Text, [UserId])) : Bool { e != emoji });
              } else {
                message.reactions.map(
                  func((e, u)) {
                    if (e == emoji) { (e, newUsers) } else { (e, u) };
                  }
                );
              };
            } else {
              let newUsers = users.concat([caller]);
              message.reactions.map(
                func((e, u)) {
                  if (e == emoji) { (e, newUsers) } else { (e, u) };
                }
              );
            };
          };
        };

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
};
