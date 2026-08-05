package com.stresscalc.controller;

import com.stresscalc.model.User;
import com.stresscalc.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    // GET /api/user/profile
    @GetMapping("/profile")
    public ResponseEntity<?> getUserProfile(HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        User user = null;

        if (userId != null) {
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isPresent()) {
                user = userOpt.get();
            }
        }

        // Fallback: If no logged in user, find first user or construct demo profile
        if (user == null) {
            user = userRepository.findAll().stream().findFirst().orElseGet(() -> {
                User demo = new User("Rafsan Rahman", "rafsan.rahman@cuet.ac.bd", LocalDate.of(2000, 1, 1), "Chittagong University of Engineering and Technology (CUET)", "demo123", "active", "6-8", "low", "smartwatch", "complex", "ASIA");
                return userRepository.save(demo);
            });
        }

        return ResponseEntity.ok(user);
    }

    // POST /api/user/profile (Update Profile)
    @PostMapping("/profile")
    public ResponseEntity<?> updateUserProfile(
            @RequestParam(name = "fullName", required = false) String fullName,
            @RequestParam(name = "dob", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dob,
            @RequestParam(name = "occupation", required = false) String occupation,
            @RequestParam(name = "activityLevel", required = false) String activityLevel,
            @RequestParam(name = "sleepDuration", required = false) String sleepDuration,
            @RequestParam(name = "caffeine", required = false) String caffeine,
            @RequestParam(name = "wearable", required = false) String wearable,
            @RequestParam(name = "focusAudio", required = false) String focusAudio,
            @RequestParam(name = "timezone", required = false) String timezone,
            HttpSession session) {

        Long userId = (Long) session.getAttribute("userId");
        User user = null;

        if (userId != null) {
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isPresent()) {
                user = userOpt.get();
            }
        }

        if (user == null) {
            user = userRepository.findAll().stream().findFirst().orElseGet(() -> {
                User demo = new User("Alex Mercer", "alex.mercer@quantified.io", LocalDate.of(1998, 5, 14), "Senior Systems Architect", "demo123");
                return userRepository.save(demo);
            });
        }

        // Update fields if provided
        if (fullName != null && !fullName.isBlank()) user.setFullName(fullName.trim());
        if (dob != null) user.setDob(dob);
        if (occupation != null && !occupation.isBlank()) user.setOccupation(occupation.trim());
        if (activityLevel != null && !activityLevel.isBlank()) user.setActivityLevel(activityLevel.trim());
        if (sleepDuration != null && !sleepDuration.isBlank()) user.setSleepDuration(sleepDuration.trim());
        if (caffeine != null && !caffeine.isBlank()) user.setCaffeine(caffeine.trim());
        if (wearable != null && !wearable.isBlank()) user.setWearable(wearable.trim());
        if (focusAudio != null && !focusAudio.isBlank()) user.setFocusAudio(focusAudio.trim());
        if (timezone != null && !timezone.isBlank()) user.setTimezone(timezone.trim());

        User updatedUser = userRepository.save(user);

        // Sync session attributes
        session.setAttribute("user", updatedUser);
        session.setAttribute("userId", updatedUser.getUserId());
        session.setAttribute("userName", updatedUser.getFullName());

        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Profile successfully updated!");
        response.put("user", updatedUser);

        return ResponseEntity.ok(response);
    }
}
