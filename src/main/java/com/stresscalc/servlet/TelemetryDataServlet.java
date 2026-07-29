package com.stresscalc.servlet;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.*;
import java.text.SimpleDateFormat;

@WebServlet("/api/telemetry-servlet")
public class TelemetryDataServlet extends HttpServlet {

    private static final String DB_URL = "jdbc:mysql://localhost:3306/stress_calculator?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC";
    private static final String DB_USER = "root";
    private static final String DB_PASS = "k#9Pz@2L$vX7mQ!y";

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();

        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("userId") == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            out.print("{\"error\": \"Unauthorized: Active session required\"}");
            return;
        }

        Long userId = (Long) session.getAttribute("userId");
        SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm");

        String sql = "SELECT log_timestamp, focus_index, cognitive_bandwidth, ambient_noise_db, tab_density " +
                     "FROM (SELECT * FROM telemetry_logs WHERE user_id = ? ORDER BY log_timestamp DESC LIMIT 20) AS recent " +
                     "ORDER BY log_timestamp ASC";

        try (Connection conn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASS);
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, userId);
            ResultSet rs = stmt.executeQuery();

            StringBuilder json = new StringBuilder("[");
            boolean first = true;

            while (rs.next()) {
                if (!first) json.append(",");
                Timestamp ts = rs.getTimestamp("log_timestamp");
                double focus = rs.getDouble("focus_index");
                int bandwidth = rs.getInt("cognitive_bandwidth");
                int noise = rs.getInt("ambient_noise_db");
                int tabs = rs.getInt("tab_density");

                json.append("{")
                    .append("\"timestamp\":\"").append(timeFormat.format(ts)).append("\",")
                    .append("\"focus_index\":").append(focus).append(",")
                    .append("\"bandwidth_percent\":").append(bandwidth).append(",")
                    .append("\"ambient_noise_db\":").append(noise).append(",")
                    .append("\"tab_density\":").append(tabs)
                    .append("}");

                first = false;
            }

            json.append("]");
            out.print(json.toString());

        } catch (SQLException e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            out.print("{\"error\": \"Database error: " + e.getMessage() + "\"}");
        }
    }
}
