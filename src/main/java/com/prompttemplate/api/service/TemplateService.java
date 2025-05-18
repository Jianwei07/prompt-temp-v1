package com.prompttemplate.api.service;

import com.prompttemplate.api.model.Template;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class TemplateService {

    @Autowired
    private BitbucketService bitbucketService;

    // Wraps the list in a JSON object, just like your Node.js API!
    public ResponseEntity<?> getAllTemplates() {
        try {
            List<Template> templates = bitbucketService.fetchAllTemplates();
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "templates", templates));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
        }
    }

    public ResponseEntity<?> getTemplateById(String id) {
        try {
            Template template = bitbucketService.getTemplateById(id);
            if (template == null) {
                return ResponseEntity.status(404).body(Map.of(
                        "success", false,
                        "error", "Template not found"));
            }
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "template", template));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
        }
    }

    public ResponseEntity<?> createTemplate(Map<String, Object> payload) {
        try {
            Template created = bitbucketService.createTemplate(payload);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "template", created));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
        }
    }

    public ResponseEntity<?> updateTemplate(String id, Map<String, Object> payload) {
        try {
            Template updated = bitbucketService.updateTemplate(id, payload);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "template", updated));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
        }
    }

    public ResponseEntity<?> deleteTemplate(String id, String comment) {
        try {
            Map<String, Object> result = bitbucketService.deleteTemplate(id, comment);
            // The result from BitbucketService should have success: true/false
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
        }
    }

    public ResponseEntity<?> getTemplateHistory(String id) {
        try {
            var history = bitbucketService.getTemplateHistory(id);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "history", history));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
        }
    }
}
