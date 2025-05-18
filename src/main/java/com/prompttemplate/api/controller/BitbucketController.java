package com.prompttemplate.api.controller;

import com.prompttemplate.api.service.BitbucketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/bitbucket")
public class BitbucketController {

    @Autowired
    private BitbucketService bitbucketService;

    @GetMapping("/structure")
    public ResponseEntity<?> getRepositoryStructure() {
        try {
            Map<String, Object> structure = bitbucketService.getRepositoryStructure();
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "departments", structure.get("departments"),
                    "appCodes", structure.get("appCodes")));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/webhooks")
    public ResponseEntity<?> handleWebhook(
            @RequestHeader("x-event-key") String event,
            @RequestBody Map<String, Object> body) {
        try {
            bitbucketService.handleWebhookEvent(event, body);
        } catch (Exception e) {
            e.printStackTrace(); // Just log
        }
        return ResponseEntity.ok(Map.of("success", true));
    }
}
