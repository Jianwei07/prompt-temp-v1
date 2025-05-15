package com.prompttemplate.api.controller;

import com.prompttemplate.api.model.Template;
import com.prompttemplate.api.service.BitbucketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/templates")
public class TemplateController {

    @Autowired
    private BitbucketService bitbucketService;

    // GET /api/templates
    @GetMapping
    public ResponseEntity<?> getAllTemplates() {
        return ResponseEntity.ok(bitbucketService.fetchAllTemplates());
    }

    // GET /api/templates/{id}
    @GetMapping("/{id}")
    public ResponseEntity<?> getTemplateById(@PathVariable String id) {
        try {
            Template template = bitbucketService.getTemplateById(id);
            if (template == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Template not found"));
            }
            return ResponseEntity.ok(template);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // POST /api/templates
    @PostMapping
    public ResponseEntity<?> createTemplate(@RequestBody Map<String, Object> payload) {
        try {
            Template created = bitbucketService.createTemplate(payload);
            return ResponseEntity.ok(Map.of("success", true, "template", created));
        } catch (UnsupportedOperationException e) {
            // For unimplemented method (remove when implemented)
            return ResponseEntity.status(501).body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // PUT /api/templates/{id}
    @PutMapping("/{id}")
    public ResponseEntity<?> updateTemplate(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        try {
            Template updated = bitbucketService.updateTemplate(id, payload);
            return ResponseEntity.ok(Map.of("success", true, "template", updated));
        } catch (UnsupportedOperationException e) {
            return ResponseEntity.status(501).body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // DELETE /api/templates/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTemplate(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, Object> payload) {
        try {
            String comment = (payload != null) ? (String) payload.getOrDefault("requestComment", "") : "";
            Map<String, Object> result = bitbucketService.deleteTemplate(id, comment);
            return ResponseEntity.ok(result);
        } catch (UnsupportedOperationException e) {
            return ResponseEntity.status(501).body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // GET /api/templates/{id}/history
    @GetMapping("/{id}/history")
    public ResponseEntity<?> getTemplateHistory(@PathVariable String id) {
        try {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "history", bitbucketService.getTemplateHistory(id)));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "history", java.util.List.of(
                            Map.of(
                                    "commitId", "error",
                                    "version", "v1.0",
                                    "userDisplayName", "System",
                                    "timestamp", new java.util.Date().toString(),
                                    "message", "Could not retrieve version history")),
                    "note", "Error occurred while fetching version history"));
        }
    }
}
