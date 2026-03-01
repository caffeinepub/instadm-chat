import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";

module {
  type OldUserProfile = {
    username : Text;
    email : Text;
    profilePicture : Text;
    bio : Text;
    isPrivate : Bool;
    onlineStatus : Bool;
    lastSeen : Int;
    blockedUsers : [Principal];
    followers : [Principal];
    following : [Principal];
    fcmToken : Text;
    createdAt : Int;
  };

  type OldActor = {
    users : Map.Map<Principal, OldUserProfile>;
  };

  type NewUserProfile = {
    username : Text;
    email : Text;
    profilePicture : Text;
    bio : Text;
    isPrivate : Bool;
    onlineStatus : Bool;
    lastSeen : Int;
    blockedUsers : [Principal];
    followers : [Principal];
    following : [Principal];
    fcmToken : Text;
    createdAt : Int;
    _id : Principal;
    fullName : Text;
    phoneNumber : Text;
    birthDate : Text;
    timezone : Text;
  };

  type NewActor = {
    users : Map.Map<Principal, NewUserProfile>;
  };

  public func run(old : OldActor) : NewActor {
    let newUsers = old.users.map<Principal, OldUserProfile, NewUserProfile>(
      func(id, oldProfile) {
        {
          oldProfile with
          _id = id;
          fullName = "";
          phoneNumber = "";
          birthDate = "";
          timezone = "";
        };
      }
    );
    { users = newUsers };
  };
};
