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

    // Optional: Webhook endpoint. Remove if not used by your CI/CD/Bitbucket
    // automation.
    @PostMapping("/webhooks")
    public ResponseEntity<?> handleWebhook(
            @RequestHeader("x-event-key") String event,
            @RequestBody Map<String, Object> body) {
        try {
            bitbucketService.handleWebhookEvent(event, body);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    // Optional: Version history endpoint (stub)
    @GetMapping("/template/{id}/history")
    public ResponseEntity<?> getTemplateHistory(@PathVariable String id) {
        try {
            var history = bitbucketService.getTemplateHistory(id);
            return ResponseEntity.ok(Map.of("success", true, "history", history));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "error", e.getMessage()));
        }
    }
}
