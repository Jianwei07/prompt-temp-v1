package com.prompttemplate.api.controller;

import com.prompttemplate.api.model.Template;
import com.prompttemplate.api.service.TemplateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/templates")
public class TemplateController {

    @Autowired
    private TemplateService templateService;

    @GetMapping
    public ResponseEntity<?> getTemplates() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "templates", templateService.getAllTemplates()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTemplate(@PathVariable String id) {
        return templateService.getTemplateById(id);
    }

    @PostMapping
    public ResponseEntity<?> createTemplate(@RequestBody Map<String, Object> payload) {
        return templateService.createTemplate(payload);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTemplate(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        return templateService.updateTemplate(id, payload);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTemplate(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, Object> payload) {
        String comment = (payload != null) ? (String) payload.getOrDefault("requestComment", "") : "";
        return templateService.deleteTemplate(id, comment);
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<?> getTemplateHistory(@PathVariable String id) {
        return templateService.getTemplateHistory(id);
    }
}
