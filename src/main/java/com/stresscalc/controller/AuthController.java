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

    // 1. Process Login (POST /login)
    @PostMapping("/login")
    public String handleLogin(
            @RequestParam(name = "loginEmail", required = false) String loginEmail,
            @RequestParam(name = "userEmail", required = false) String userEmail,
            @RequestParam(name = "loginPassword", required = false) String loginPassword,
            @RequestParam(name = "userPassword", required = false) String userPassword,
            HttpSession session) {

        String email = (loginEmail != null && !loginEmail.isBlank()) ? loginEmail : userEmail;
        String password = (loginPassword != null && !loginPassword.isBlank()) ? loginPassword : userPassword;

        if (email == null || password == null) {
            return "redirect:/auth.html?error=missing_fields";
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim());

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Validate password hash/string
            if (user.getPasswordHash().equals(password)) {
                session.setAttribute("user", user);
                session.setAttribute("userId", user.getUserId());
                session.setAttribute("userName", user.getFullName());
                return "redirect:/dashboard.html";
            }
        }

        // Auto-create user for seamless demo if user doesn't exist yet
        User demoUser = new User(
                "Demo User",
                email.trim(),
                LocalDate.of(2000, 1, 1),
                "Software Engineer",
                password
        );
        userRepository.save(demoUser);

        session.setAttribute("user", demoUser);
        session.setAttribute("userId", demoUser.getUserId());
        session.setAttribute("userName", demoUser.getFullName());
        return "redirect:/dashboard.html";
    }

    // 2. Process Registration (POST /register)
    @PostMapping("/register")
    public String handleRegister(
            @RequestParam(name = "fullName", required = false) String fullName,
            @RequestParam(name = "regName", required = false) String regName,
            @RequestParam(name = "email", required = false) String email,
            @RequestParam(name = "regEmail", required = false) String regEmail,
            @RequestParam(name = "regDOB", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate regDOB,
            @RequestParam(name = "dob", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dob,
            @RequestParam(name = "organization", required = false) String organization,
            @RequestParam(name = "regOccupation", required = false) String regOccupation,
            @RequestParam(name = "activityLevel", required = false, defaultValue = "active") String activityLevel,
            @RequestParam(name = "sleepDuration", required = false, defaultValue = "6-8") String sleepDuration,
            @RequestParam(name = "caffeine", required = false, defaultValue = "low") String caffeine,
            @RequestParam(name = "wearable", required = false, defaultValue = "none") String wearable,
            @RequestParam(name = "focusAudio", required = false, defaultValue = "complex") String focusAudio,
            @RequestParam(name = "timezone", required = false, defaultValue = "ASIA") String timezone,
            @RequestParam(name = "password", required = false) String password,
            @RequestParam(name = "regPassword", required = false) String regPassword,
            HttpSession session) {

        String name = (fullName != null && !fullName.isBlank()) ? fullName : ((regName != null && !regName.isBlank()) ? regName : "New User");
        String userEmail = (email != null && !email.isBlank()) ? email : regEmail;
        LocalDate birthDate = (regDOB != null) ? regDOB : ((dob != null) ? dob : LocalDate.of(2000, 1, 1));
        String org = (organization != null && !organization.isBlank()) ? organization : ((regOccupation != null && !regOccupation.isBlank()) ? regOccupation : "General");
        String pass = (password != null && !password.isBlank()) ? password : regPassword;

        if (userEmail == null || pass == null) {
            return "redirect:/auth.html?error=missing_fields";
        }

        // Save User into Database
        User newUser = new User(
                name,
                userEmail.trim(),
                birthDate,
                org,
                pass,
                activityLevel,
                sleepDuration,
                caffeine,
                wearable,
                focusAudio,
                timezone
        );
        userRepository.save(newUser);

        session.setAttribute("user", newUser);
        session.setAttribute("userId", newUser.getUserId());
        session.setAttribute("userName", newUser.getFullName());

        return "redirect:/dashboard.html";
    }
}
