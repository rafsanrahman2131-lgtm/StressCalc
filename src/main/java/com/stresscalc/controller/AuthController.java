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
            @RequestParam(name = "regName", required = false) String regName,
            @RequestParam(name = "userName", required = false) String userName,
            @RequestParam(name = "regEmail", required = false) String regEmail,
            @RequestParam(name = "userEmail", required = false) String userEmail,
            @RequestParam(name = "regDOB", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate regDOB,
            @RequestParam(name = "dob", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dob,
            @RequestParam(name = "regOccupation", required = false) String regOccupation,
            @RequestParam(name = "occupation", required = false) String occupation,
            @RequestParam(name = "regPassword", required = false) String regPassword,
            @RequestParam(name = "userPassword", required = false) String userPassword,
            HttpSession session) {

        String name = (regName != null && !regName.isBlank()) ? regName : ((userName != null) ? userName : "New User");
        String email = (regEmail != null && !regEmail.isBlank()) ? regEmail : userEmail;
        LocalDate birthDate = (regDOB != null) ? regDOB : ((dob != null) ? dob : LocalDate.of(2000, 1, 1));
        String role = (regOccupation != null && !regOccupation.isBlank()) ? regOccupation : ((occupation != null) ? occupation : "General");
        String password = (regPassword != null && !regPassword.isBlank()) ? regPassword : userPassword;

        if (email == null || password == null) {
            return "redirect:/auth.html?error=missing_fields";
        }

        // Save User into MySQL Database
        User newUser = new User(name, email.trim(), birthDate, role, password);
        userRepository.save(newUser);

        session.setAttribute("user", newUser);
        session.setAttribute("userId", newUser.getUserId());
        session.setAttribute("userName", newUser.getFullName());

        return "redirect:/dashboard.html";
    }
}
