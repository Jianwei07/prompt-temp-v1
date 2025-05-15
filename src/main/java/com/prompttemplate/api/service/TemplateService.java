package com.prompttemplate.api.service;

import com.prompttemplate.api.model.Template;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class TemplateService {

    @Autowired
    private BitbucketService bitbucketService;

    public List<Template> getAllTemplates() {
        return bitbucketService.fetchAllTemplates();
    }

    public ResponseEntity<?> getTemplateById(String id) {
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

    public ResponseEntity<?> createTemplate(Map<String, Object> payload) {
        try {
            Template created = bitbucketService.createTemplate(payload);
            return ResponseEntity.ok(Map.of("success", true, "template", created));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    public ResponseEntity<?> updateTemplate(String id, Map<String, Object> payload) {
        try {
            Template updated = bitbucketService.updateTemplate(id, payload);
            return ResponseEntity.ok(Map.of("success", true, "template", updated));
        } catch (UnsupportedOperationException e) {
            return ResponseEntity.status(501)
                    .body(Map.of("success", false, "error", "updateTemplate not implemented yet"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    public ResponseEntity<?> deleteTemplate(String id, String comment) {
        try {
            Map<String, Object> result = bitbucketService.deleteTemplate(id, comment);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    public ResponseEntity<?> getTemplateHistory(String id) {
        try {
            List<Map<String, Object>> history = bitbucketService.getTemplateHistory(id);
            return ResponseEntity.ok(Map.of("success", true, "history", history));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "history", List.of(Map.of(
                            "commitId", "error",
                            "version", "v1.0",
                            "userDisplayName", "System",
                            "timestamp", new Date().toString(),
                            "message", "Could not retrieve version history")),
                    "note", "Error occurred while fetching version history"));
        }
    }
}
