package com.prompttemplate.api;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class PromptTemplateApplication {
    public static void main(String[] args) {
        // Load .env.local
        Dotenv dotenv = Dotenv.configure()
                .filename(".env.local")
                .ignoreIfMissing()
                .load();

        // Set as system properties so Spring can resolve them
        dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));

        SpringApplication.run(PromptTemplateApplication.class, args);
    }
}
