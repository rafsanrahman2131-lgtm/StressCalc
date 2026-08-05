package com.stresscalc.controller;

import com.stresscalc.model.User;
import com.stresscalc.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

@Controller
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    // 1. Process Login (POST /login) — username + password based
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

    // 2. Fortified Registration (POST /register) — Graceful Exception & Duplicate Validation
    @PostMapping("/register")
    @ResponseBody
    public ResponseEntity<?> handleRegister(
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

        String regEmail = email;
        String regUsername = username;
        String regPassword = password;
        String regFirstName = firstName;
        String regLastName = lastName;
        String regCity = city;
        String regCountry = country;
        String regOrg = organization;
        LocalDate regBirthDate = regDOB;

        if (regEmail == null || regEmail.isBlank() || regPassword == null || regPassword.isBlank()) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Email and password are required."));
        }

        String cleanEmail = regEmail.trim();

        // 1. Proactive Validation: Check Email
        if (userRepository.existsByEmail(cleanEmail)) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "A user with this email already exists."));
        }

        // 2. Proactive Validation: Check Username
        if (regUsername != null && !regUsername.isBlank() && userRepository.existsByUsername(regUsername.trim().toLowerCase())) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "This username is already taken."));
        }

        try {
            String first = (regFirstName != null && !regFirstName.isBlank()) ? regFirstName.trim() : "User";
            String last = (regLastName != null && !regLastName.isBlank()) ? regLastName.trim() : "";
            String fullName = last.isEmpty() ? first : (first + " " + last);
            LocalDate birthDate = (regBirthDate != null) ? regBirthDate : LocalDate.of(2000, 1, 1);
            String orgStr = (regOrg != null && !regOrg.isBlank()) ? regOrg.trim() : "";

            User newUser = new User(fullName, cleanEmail, birthDate, orgStr, regPassword,
                    activityLevel, sleepDuration, caffeine, wearable, focusAudio, "ASIA");

            newUser.setFirstName(first);
            newUser.setLastName(last);
            if (regUsername != null && !regUsername.isBlank()) {
                newUser.setUsername(regUsername.trim().toLowerCase());
            }
            if (regCity != null && !regCity.isBlank()) newUser.setCity(regCity.trim());
            if (regCountry != null && !regCountry.isBlank()) newUser.setCountry(regCountry.trim());

            userRepository.save(newUser);

            session.setAttribute("user", newUser);
            session.setAttribute("userId", newUser.getUserId());
            session.setAttribute("userName", newUser.getFullName());

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(Map.of("message", "Registration successful!", "redirect", "/dashboard.html"));

        } catch (DataIntegrityViolationException e) {
            // Fallback catch in case of a race condition
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Database conflict occurred. Please try again."));
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred during registration."));
        }
    }
}
