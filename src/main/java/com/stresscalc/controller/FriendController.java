package com.stresscalc.controller;

import com.stresscalc.model.Friend;
import com.stresscalc.model.Notification;
import com.stresscalc.model.User;
import com.stresscalc.repository.FriendRepository;
import com.stresscalc.repository.NotificationRepository;
import com.stresscalc.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/friends")
public class FriendController {

    @Autowired
    private FriendRepository friendRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    // GET /api/friends — returns accepted friends & pending requests for session user
    @GetMapping
    public ResponseEntity<?> getFriends(HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }

        // Accepted friends where I am the requester
        List<Friend> sentAccepted = friendRepository.findByUserIdAndStatus(userId, "accepted");
        // Accepted friends where I am the recipient
        List<Friend> receivedAccepted = friendRepository.findByFriendIdAndStatus(userId, "accepted");
        // Pending requests sent TO me
        List<Friend> pendingRequests = friendRepository.findByFriendIdAndStatus(userId, "pending");

        Set<Long> friendIds = new HashSet<>();
        sentAccepted.forEach(f -> friendIds.add(f.getFriendId()));
        receivedAccepted.forEach(f -> friendIds.add(f.getUserId()));

        List<Map<String, Object>> friends = new ArrayList<>();
        for (Long fId : friendIds) {
            userRepository.findById(fId).ifPresent(u -> {
                Map<String, Object> m = new HashMap<>();
                m.put("userId", u.getUserId());
                m.put("username", u.getUsername());
                m.put("fullName", u.getFullName());
                m.put("profilePic", u.getProfilePic());
                m.put("occupation", u.getOccupation());
                friends.add(m);
            });
        }

        List<Map<String, Object>> pending = new ArrayList<>();
        for (Friend f : pendingRequests) {
            userRepository.findById(f.getUserId()).ifPresent(u -> {
                Map<String, Object> m = new HashMap<>();
                m.put("friendshipId", f.getId());
                m.put("userId", u.getUserId());
                m.put("username", u.getUsername());
                m.put("fullName", u.getFullName());
                m.put("profilePic", u.getProfilePic());
                pending.add(m);
            });
        }

        Map<String, Object> response = new HashMap<>();
        response.put("friends", friends);
        response.put("pendingRequests", pending);
        response.put("friendCount", friends.size());
        return ResponseEntity.ok(response);
    }

    // POST /api/friends/request — send friend request by username
    @PostMapping("/request")
    public ResponseEntity<?> sendRequest(
            @RequestParam(name = "targetUsername", required = false) String targetUsernameParam,
            @RequestBody(required = false) Map<String, String> body,
            HttpSession session) {

        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }

        String targetUsername = targetUsernameParam;
        if (targetUsername == null && body != null && body.containsKey("targetUsername")) {
            targetUsername = body.get("targetUsername");
        }

        if (targetUsername == null || targetUsername.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Target username required"));
        }

        Optional<User> targetOpt = userRepository.findByUsername(targetUsername.trim().toLowerCase());
        if (targetOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        User target = targetOpt.get();
        if (target.getUserId().equals(userId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot add yourself"));
        }

        // Check if friendship already exists in either direction
        if (friendRepository.existsByUserIdAndFriendId(userId, target.getUserId()) ||
            friendRepository.existsByUserIdAndFriendId(target.getUserId(), userId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request already sent or already friends"));
        }

        Friend request = new Friend(userId, target.getUserId(), "pending");
        friendRepository.save(request);

        // Notify the target user
        User sender = userRepository.findById(userId).orElse(null);
        if (sender != null) {
            String senderName = sender.getUsername() != null ? sender.getUsername() : sender.getFullName();
            Notification notif = new Notification(target.getUserId(), "friend_request",
                    senderName + " sent you a friend request.");
            notificationRepository.save(notif);
        }

        return ResponseEntity.ok(Map.of("status", "ok", "message", "Friend request sent to @" + targetUsername));
    }

    private void updateNotificationStatus(Long userId, String friendUsername, boolean isAccept) {
        if (userId == null || friendUsername == null || friendUsername.isBlank()) return;
        try {
            List<Notification> notifs = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
            for (Notification n : notifs) {
                String msg = n.getMessage() != null ? n.getMessage().toLowerCase() : "";
                if (msg.contains(friendUsername.toLowerCase()) && (msg.contains("friend request") || "friend_request".equals(n.getType()))) {
                    n.setMessage("Friend request from " + friendUsername + " has been " + (isAccept ? "accepted" : "declined") + ".");
                    n.setType("friend_" + (isAccept ? "accepted" : "declined"));
                    n.setRead(true);
                    notificationRepository.save(n);
                }
            }
        } catch (Exception e) {
            System.err.println("Could not update notification status: " + e.getMessage());
        }
    }

    // POST /api/friends/accept — accept friend request via JSON body
    @PostMapping("/accept")
    public ResponseEntity<?> acceptFriendRequestJson(
            @RequestBody(required = false) Map<String, String> payload,
            HttpSession session) {

        Long userId = (Long) session.getAttribute("userId");
        String friendUsername = (payload != null) ? payload.get("friendUsername") : null;

        if (friendUsername != null && !friendUsername.isBlank()) {
            Optional<User> friendUser = userRepository.findByUsername(friendUsername.trim().toLowerCase());
            if (friendUser.isPresent()) {
                Long fId = friendUser.get().getUserId();
                if (userId != null) {
                    Optional<Friend> friendshipOpt = friendRepository.findByUserIdAndFriendId(fId, userId);
                    if (friendshipOpt.isPresent()) {
                        Friend f = friendshipOpt.get();
                        f.setStatus("accepted");
                        friendRepository.save(f);
                    }
                    updateNotificationStatus(userId, friendUsername, true);
                    return ResponseEntity.ok(Map.of("message", "Friend request accepted"));
                }
            }
        }
        return ResponseEntity.ok(Map.of("message", "Friend request accepted"));
    }

    // POST /api/friends/accept/{id} — accept a pending request by ID
    @PostMapping("/accept/{id}")
    public ResponseEntity<?> acceptRequestById(@PathVariable Long id, HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }

        Optional<Friend> friendOpt = friendRepository.findById(id);
        if (friendOpt.isPresent()) {
            Friend f = friendOpt.get();
            f.setStatus("accepted");
            friendRepository.save(f);

            userRepository.findById(f.getUserId()).ifPresent(reqUser -> {
                updateNotificationStatus(userId, reqUser.getUsername(), true);
            });
        }

        return ResponseEntity.ok(Map.of("status", "accepted", "message", "Friend request accepted"));
    }

    // POST /api/friends/decline — decline friend request via JSON body
    @PostMapping("/decline")
    public ResponseEntity<?> declineFriendRequestJson(
            @RequestBody(required = false) Map<String, String> payload,
            HttpSession session) {

        Long userId = (Long) session.getAttribute("userId");
        String friendUsername = (payload != null) ? payload.get("friendUsername") : null;

        if (friendUsername != null && !friendUsername.isBlank() && userId != null) {
            Optional<User> friendUser = userRepository.findByUsername(friendUsername.trim().toLowerCase());
            if (friendUser.isPresent()) {
                Long fId = friendUser.get().getUserId();
                friendRepository.findByUserIdAndFriendId(fId, userId).ifPresent(friendRepository::delete);
                friendRepository.findByUserIdAndFriendId(userId, fId).ifPresent(friendRepository::delete);
            }
            updateNotificationStatus(userId, friendUsername, false);
        }
        return ResponseEntity.ok(Map.of("message", "Friend request declined"));
    }

    // POST /api/friends/decline/{id} — decline a pending request by ID
    @PostMapping("/decline/{id}")
    public ResponseEntity<?> declineRequestById(@PathVariable Long id, HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        Optional<Friend> friendOpt = friendRepository.findById(id);
        if (friendOpt.isPresent()) {
            Friend f = friendOpt.get();
            friendRepository.delete(f);

            if (userId != null) {
                userRepository.findById(f.getUserId()).ifPresent(reqUser -> {
                    updateNotificationStatus(userId, reqUser.getUsername(), false);
                });
            }
        }
        return ResponseEntity.ok(Map.of("status", "declined", "message", "Friend request declined"));
    }

    // GET /api/friends/search?username=xxx — find user by username
    @GetMapping("/search")
    public ResponseEntity<?> searchUser(@RequestParam("username") String username, HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }

        Optional<User> userOpt = userRepository.findByUsername(username.trim().toLowerCase());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        User found = userOpt.get();
        Map<String, Object> result = new HashMap<>();
        result.put("userId", found.getUserId());
        result.put("username", found.getUsername());
        result.put("fullName", found.getFullName());
        result.put("profilePic", found.getProfilePic());
        result.put("occupation", found.getOccupation());
        return ResponseEntity.ok(result);
    }

    // POST /api/friends/set-username — force-set username for legacy users
    @PostMapping("/set-username")
    public ResponseEntity<?> setUsername(
            @RequestParam("username") String username,
            HttpSession session) {

        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }

        String clean = username.trim().toLowerCase().replaceAll("[^a-z0-9_.]", "");
        if (clean.length() < 3) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username too short (min 3 characters)"));
        }

        if (userRepository.existsByUsername(clean)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username already taken"));
        }

        userRepository.findById(userId).ifPresent(u -> {
            u.setUsername(clean);
            userRepository.save(u);
        });

        return ResponseEntity.ok(Map.of("status", "ok", "username", clean));
    }
}
