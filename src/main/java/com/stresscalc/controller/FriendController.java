package com.stresscalc.controller;

import com.stresscalc.model.Friend;
import com.stresscalc.model.Notification;
import com.stresscalc.model.User;
import com.stresscalc.repository.FriendRepository;
import com.stresscalc.repository.NotificationRepository;
import com.stresscalc.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/friends")
public class FriendController {

    @Autowired
    private FriendRepository friendRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    // GET /api/friends — returns accepted friends for session user
    @GetMapping
    public ResponseEntity<?> getFriends(HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
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
            @RequestParam("targetUsername") String targetUsername,
            HttpSession session) {

        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        Optional<User> targetOpt = userRepository.findByUsername(targetUsername.trim().toLowerCase());
        if (targetOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
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

    // POST /api/friends/accept/{id} — accept a pending request
    @PostMapping("/accept/{id}")
    public ResponseEntity<?> acceptRequest(@PathVariable Long id, HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        Optional<Friend> friendOpt = friendRepository.findById(id);
        if (friendOpt.isEmpty() || !friendOpt.get().getFriendId().equals(userId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Cannot accept this request"));
        }

        Friend friendship = friendOpt.get();
        friendship.setStatus("accepted");
        friendRepository.save(friendship);

        // Notify the requester
        User accepter = userRepository.findById(userId).orElse(null);
        if (accepter != null) {
            String name = accepter.getUsername() != null ? accepter.getUsername() : accepter.getFullName();
            Notification notif = new Notification(friendship.getUserId(), "friend_accepted",
                    name + " accepted your friend request!");
            notificationRepository.save(notif);
        }

        return ResponseEntity.ok(Map.of("status", "accepted"));
    }

    // GET /api/friends/search?username=xxx — find user by username (for Add Friend)
    @GetMapping("/search")
    public ResponseEntity<?> searchUser(@RequestParam("username") String username, HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        Optional<User> userOpt = userRepository.findByUsername(username.trim().toLowerCase());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
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
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
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
