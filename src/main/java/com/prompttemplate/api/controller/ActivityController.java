package com.prompttemplate.api.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/activities")
public class ActivityController {

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllActivities() {
        // Placeholder response until service layer is implemented
        return ResponseEntity.ok(List.of());
    }
}
