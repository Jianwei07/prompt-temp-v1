package com.prompttemplate.api.model;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class Template {
    private String id;
    private String name;
    private String department;
    private String appCode;
    private String version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
    private String content;
    private String instructions;
    private List<Example> examples;

    @Data
    public static class Example {
        private String input;
        private String output;
    }
}
