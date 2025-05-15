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
    private String content;
    private String instructions;
    private List<Example> examples;
    private String version;
    private LocalDateTime createdAt;
    private String createdBy;
    private LocalDateTime updatedAt;
    private String updatedBy;

    @Data
    public static class Example {
        private String userInput;
        private String expectedOutput;
    }
}