package com.stresscalc.controller;

import com.stresscalc.model.User;
import com.stresscalc.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.util.Optional;

@Controller
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    // 1. Process Login (POST /login) — now username + password based
    @PostMapping("/login")
    public String handleLogin(
            @RequestParam(name = "loginUsername", required = false) String loginUsername,
            @RequestParam(name = "loginPassword", required = false) String loginPassword,
            // Legacy email fallback for existing users
            @RequestParam(name = "loginEmail", required = false) String loginEmail,
            HttpSession session) {

        String password = loginPassword;
        if (password == null || password.isBlank()) {
            return "redirect:/auth.html?error=missing_fields";
        }

        User user = null;

        // Primary: find by username
        if (loginUsername != null && !loginUsername.isBlank()) {
            Optional<User> byUsername = userRepository.findByUsername(loginUsername.trim());
            if (byUsername.isPresent() && byUsername.get().getPasswordHash().equals(password)) {
                user = byUsername.get();
            }
            // Fallback: try email if username lookup fails (legacy users)
            if (user == null) {
                Optional<User> byEmail = userRepository.findByEmail(loginUsername.trim());
                if (byEmail.isPresent() && byEmail.get().getPasswordHash().equals(password)) {
                    user = byEmail.get();
                }
            }
        }

        // Legacy email field fallback
        if (user == null && loginEmail != null && !loginEmail.isBlank()) {
            Optional<User> byEmail = userRepository.findByEmail(loginEmail.trim());
            if (byEmail.isPresent() && byEmail.get().getPasswordHash().equals(password)) {
                user = byEmail.get();
            }
        }

        if (user == null) {
            return "redirect:/auth.html?error=invalid_credentials";
        }

        session.setAttribute("user", user);
        session.setAttribute("userId", user.getUserId());
        session.setAttribute("userName", user.getFullName());

        // If user has no username, redirect to force username setup
        if (user.getUsername() == null || user.getUsername().isBlank()) {
            return "redirect:/dashboard.html?forceUsername=1";
        }

        return "redirect:/dashboard.html";
    }

    // 2. Process Registration (POST /register)
    @PostMapping("/register")
    public String handleRegister(
            @RequestParam(name = "firstName", required = false) String firstName,
            @RequestParam(name = "lastName", required = false) String lastName,
            @RequestParam(name = "username", required = false) String username,
            @RequestParam(name = "email", required = false) String email,
            @RequestParam(name = "regDOB", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate regDOB,
            @RequestParam(name = "organization", required = false) String organization,
            @RequestParam(name = "city", required = false) String city,
            @RequestParam(name = "country", required = false) String country,
            @RequestParam(name = "activityLevel", required = false, defaultValue = "sedentary") String activityLevel,
            @RequestParam(name = "sleepDuration", required = false, defaultValue = "6-8") String sleepDuration,
            @RequestParam(name = "caffeine", required = false, defaultValue = "none") String caffeine,
            @RequestParam(name = "wearable", required = false, defaultValue = "none") String wearable,
            @RequestParam(name = "focusAudio", required = false, defaultValue = "silence") String focusAudio,
            @RequestParam(name = "password", required = false) String password,
            HttpSession session) {

        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return "redirect:/auth.html?error=missing_fields";
        }

        // Reject duplicate username
        if (username != null && !username.isBlank() && userRepository.existsByUsername(username.trim())) {
            return "redirect:/auth.html?error=username_taken";
        }

        String first = (firstName != null && !firstName.isBlank()) ? firstName.trim() : "User";
        String last = (lastName != null && !lastName.isBlank()) ? lastName.trim() : "";
        String fullName = (last.isEmpty()) ? first : (first + " " + last);
        LocalDate birthDate = (regDOB != null) ? regDOB : LocalDate.of(2000, 1, 1);
        String org = (organization != null && !organization.isBlank()) ? organization.trim() : "";

        User newUser = new User(fullName, email.trim(), birthDate, org, password,
                activityLevel, sleepDuration, caffeine, wearable, focusAudio, "ASIA");

        newUser.setFirstName(first);
        newUser.setLastName(last);
        if (username != null && !username.isBlank()) {
            newUser.setUsername(username.trim().toLowerCase());
        }
        if (city != null && !city.isBlank()) newUser.setCity(city.trim());
        if (country != null && !country.isBlank()) newUser.setCountry(country.trim());

        userRepository.save(newUser);

        session.setAttribute("user", newUser);
        session.setAttribute("userId", newUser.getUserId());
        session.setAttribute("userName", newUser.getFullName());

        return "redirect:/dashboard.html";
    }
}
