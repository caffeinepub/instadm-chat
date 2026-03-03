import Map "mo:core/Map";
import Principal "mo:core/Principal";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Int "mo:core/Int";

module {
  type UserId = Principal;
  type Timestamp = Int;
  type ChatId = Text;
  type MessageId = Text;
  type GroupId = Text;
  type ChannelId = Text;
  type StoryId = Text;
  type StatusId = Text;
  type MessageType = { #text; #image; #video; #voice; #file; #gif };
  type NotificationType = { #message; #request; #reaction };
  type MessageStatus = { #pending; #accepted; #declined };

  type OriginalUserProfile = {
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
  };

  type OriginalChat = {
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

  type OriginalGroupChat = {
    id : Text;
    name : Text;
    description : Text;
    adminId : UserId;
    members : [UserId];
    createdAt : Timestamp;
    lastMessage : ?Text;
    lastUpdated : Timestamp;
    typing : [(Text, Bool)];
  };

  type OriginalMessage = {
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

  type OriginalMessageRequest = {
    senderId : UserId;
    receiverId : UserId;
    chatId : ChatId;
    status : MessageStatus;
    createdAt : Timestamp;
  };

  type OriginalNotification = {
    _type : NotificationType;
    senderId : UserId;
    receiverId : UserId;
    chatId : ?ChatId;
    messageId : ?MessageId;
    read : Bool;
    createdAt : Timestamp;
  };

  type OriginalActor = {
    users : Map.Map<UserId, OriginalUserProfile>;
    chats : Map.Map<ChatId, OriginalChat>;
    groupChats : Map.Map<GroupId, OriginalGroupChat>;
    messages : Map.Map<MessageId, OriginalMessage>;
    groupMessages : Map.Map<MessageId, OriginalMessage>;
    messageRequests : Map.Map<Text, OriginalMessageRequest>;
    notifications : Map.Map<Text, OriginalNotification>;
    temporaryFolders : Map.Map<Principal, Map.Map<Text, Text>>;
  };

  type UpdatedUserProfile = {
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

  type UpdatedChat = {
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

  type UpdatedGroupChat = {
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

  type UpdatedMessage = {
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

  type UpdatedMessageRequest = {
    senderId : UserId;
    receiverId : UserId;
    chatId : ChatId;
    status : MessageStatus;
    createdAt : Timestamp;
  };

  type UpdatedNotification = {
    _type : NotificationType;
    senderId : UserId;
    receiverId : UserId;
    chatId : ?ChatId;
    messageId : ?MessageId;
    read : Bool;
    createdAt : Timestamp;
  };

  type UpdatedActor = {
    users : Map.Map<UserId, UpdatedUserProfile>;
    chats : Map.Map<ChatId, UpdatedChat>;
    groupChats : Map.Map<GroupId, UpdatedGroupChat>;
    messages : Map.Map<MessageId, UpdatedMessage>;
    groupMessages : Map.Map<MessageId, UpdatedMessage>;
    messageRequests : Map.Map<Text, UpdatedMessageRequest>;
    notifications : Map.Map<Text, UpdatedNotification>;
    channels : Map.Map<ChannelId, Channel>;
    channelMessages : Map.Map<MessageId, Message>;
    stories : Map.Map<StoryId, Story>;
    statuses : Map.Map<StatusId, Status>;
    temporaryFolders : Map.Map<Principal, Map.Map<Text, Text>>;
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

  public func run(old : OriginalActor) : UpdatedActor {
    let updatedUsers = old.users.map<UserId, OriginalUserProfile, UpdatedUserProfile>(
      func(_id, original) {
        { original with closeFriends = [] };
      }
    );

    let updatedGroupChats = old.groupChats.map<GroupId, OriginalGroupChat, UpdatedGroupChat>(
      func(_id, original) {
        {
          original with
          inviteLink = "";
          slowMode = 0;
        };
      }
    );

    {
      old with
      users = updatedUsers;
      groupChats = updatedGroupChats;
      channels = Map.empty<ChannelId, Channel>();
      channelMessages = Map.empty<MessageId, Message>();
      stories = Map.empty<StoryId, Story>();
      statuses = Map.empty<StatusId, Status>();
    };
  };
};
