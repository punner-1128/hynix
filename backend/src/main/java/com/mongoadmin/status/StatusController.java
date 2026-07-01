package com.mongoadmin.status;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StatusController {

    @GetMapping("/api/status")
    public Map<String, Object> status() {
        return Map.of(
            "service", "mongo-admin-backend",
            "status", "UP",
            "port", 8080
        );
    }
}
