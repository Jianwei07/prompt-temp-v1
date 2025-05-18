package com.prompttemplate.api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.prompttemplate.api.model.Template;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.*;

@Service
public class BitbucketService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${bitbucket.workspace}")
    private String workspace;

    @Value("${bitbucket.repoSlug}")
    private String repoSlug;

    @Value("${bitbucket.username:System}")
    private String username;

    @Value("${bitbucket.appPassword}")
    private String appPassword;

    @Value("${template.delete.requireApproval:true}")
    private boolean requireApproval;

    public BitbucketService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /** Utility: Get current UTC as ISO string (for createdAt/updatedAt) */
    private String getUtcTimeString() {
        return java.time.Instant.now().toString();
    }

    /** Utility: Parse date string, return LocalDateTime or null */
    private LocalDateTime safeParseDate(String input, String label) {
        try {
            if (input == null || input.isBlank())
                return null;
            return ZonedDateTime.parse(input).toLocalDateTime();
        } catch (Exception e) {
            System.err.printf("⚠️ Skipping invalid date for %s: \"%s\"%n", label, input);
            return null;
        }
    }

    /** Utility: Generate random UUID for new ID */
    private String generateId(JsonNode metadata) {
        return UUID.randomUUID().toString();
    }

    /** Utility: Turn List<Map<String,String>> to List<Template.Example> */
    private List<Template.Example> toExampleList(List<Map<String, String>> exampleMaps) {
        List<Template.Example> result = new ArrayList<>();
        for (Map<String, String> map : exampleMaps) {
            Template.Example ex = new Template.Example();
            ex.setUserInput(map.getOrDefault("User Input", ""));
            ex.setExpectedOutput(map.getOrDefault("Expected Output", ""));
            result.add(ex);
        }
        return result;
    }

    /** Utility: Convert "examples" in request to canonical Example list */
    private List<Map<String, String>> processExamples(Object examplesObj) {
        List<Map<String, String>> processed = new ArrayList<>();
        if (examplesObj instanceof List<?> exampleList) {
            for (Object ex : exampleList) {
                if (ex instanceof Map<?, ?> map) {
                    // Try all possible user input/output keys, fallback to empty
                    String input = map.get("input") != null ? map.get("input").toString()
                            : map.get("userInput") != null ? map.get("userInput").toString()
                                    : map.get("question") != null ? map.get("question").toString() : "";
                    String output = map.get("output") != null ? map.get("output").toString()
                            : map.get("expectedOutput") != null ? map.get("expectedOutput").toString()
                                    : map.get("answer") != null ? map.get("answer").toString() : "";
                    processed.add(Map.of(
                            "User Input", input,
                            "Expected Output", output));
                }
            }
        }
        return processed;
    }

    /** 1. List all templates */
    public List<Template> fetchAllTemplates() {
        List<Template> result = new ArrayList<>();
        try {
            JsonNode metadata = fetchMetadata();
            for (JsonNode node : metadata) {
                Template t = new Template();
                t.setId(node.path("id").asText(""));
                t.setName(node.path("name").asText(""));
                t.setDepartment(node.path("Department").asText(""));
                t.setAppCode(node.path("AppCode").asText(""));
                t.setVersion(node.path("version").asText("v1.0"));
                t.setCreatedBy(node.path("createdBy").asText(""));
                t.setUpdatedBy(node.path("updatedBy").asText(""));
                t.setCreatedAt(safeParseDate(node.path("createdAt").asText(""), "createdAt"));
                t.setUpdatedAt(safeParseDate(node.path("updatedAt").asText(""), "updatedAt"));

                // Optionally fetch content for listing; set blank/empty if not found
                try {
                    String link = node.path("link").asText("");
                    if (!link.isEmpty()) {
                        JsonNode contentNode = fetchFileContent(link);
                        t.setContent(contentNode.path("Main Prompt Content").asText(""));
                        t.setInstructions(contentNode.path("Additional Instructions").asText(""));
                        // Parse examples
                        List<Template.Example> exampleList = new ArrayList<>();
                        if (contentNode.has("Examples") && contentNode.get("Examples").isArray()) {
                            for (JsonNode ex : contentNode.get("Examples")) {
                                String userInput = ex.has("User Input") ? ex.get("User Input").asText("") : "";
                                String expectedOutput = ex.has("Expected Output") ? ex.get("Expected Output").asText("")
                                        : "";
                                exampleList.add(new Template.Example(userInput, expectedOutput));
                            }
                        }
                        t.setExamples(exampleList);
                    }
                } catch (Exception e) {
                    t.setContent("");
                    t.setInstructions("");
                    t.setExamples(List.of());
                }
                result.add(t);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    /** 2. Get one template (full content) */
    public Template getTemplateById(String id) throws Exception {
        JsonNode metadata = fetchMetadata();
        for (JsonNode node : metadata) {
            if (id.equals(node.path("id").asText())) {
                String filePath = node.path("link").asText();
                JsonNode fileContent = fetchFileContent(filePath);

                Template template = new Template();
                template.setId(id);
                template.setName(node.path("name").asText(""));
                template.setDepartment(node.path("Department").asText(""));
                template.setAppCode(node.path("AppCode").asText(""));
                template.setVersion(node.path("version").asText("v1.0"));
                template.setCreatedAt(safeParseDate(node.path("createdAt").asText(""), "createdAt"));
                template.setUpdatedAt(safeParseDate(node.path("updatedAt").asText(""), "updatedAt"));
                template.setCreatedBy(node.path("createdBy").asText(""));
                template.setUpdatedBy(node.path("updatedBy").asText(""));
                template.setContent(fileContent.path("Main Prompt Content").asText(""));
                template.setInstructions(fileContent.path("Additional Instructions").asText(""));
                // Parse examples
                List<Map<String, String>> examples = objectMapper.convertValue(
                        fileContent.get("Examples"),
                        new TypeReference<List<Map<String, String>>>() {
                        });
                template.setExamples(toExampleList(examples));
                return template;
            }
        }
        return null;
    }

    /** 3. Create template */
    public Template createTemplate(Map<String, Object> payload) throws Exception {
        // Validate
        for (String key : List.of("name", "content", "department", "appCode")) {
            if (!payload.containsKey(key) || payload.get(key) == null || payload.get(key).toString().isBlank())
                throw new IllegalArgumentException("Missing required field: " + key);
        }
        String name = payload.get("name").toString();
        String content = payload.get("content").toString();
        String department = payload.get("department").toString();
        String appCode = payload.get("appCode").toString();
        String instructions = payload.getOrDefault("instructions", "").toString();
        Object examplesObj = payload.get("examples");

        List<Map<String, String>> processedExamples = processExamples(examplesObj);
        String fileName = name.replaceAll("\\s+", "-") + ".json";
        String filePath = department + "/" + appCode + "/" + fileName;

        JsonNode metadata = fetchMetadata();
        String newId = generateId(metadata);
        String utcTimeString = getUtcTimeString();
        String user = this.username;

        ObjectNode newMetadataEntry = objectMapper.createObjectNode();
        newMetadataEntry.put("id", newId);
        newMetadataEntry.put("Department", department);
        newMetadataEntry.put("AppCode", appCode);
        newMetadataEntry.put("name", name);
        newMetadataEntry.put("link", filePath);
        newMetadataEntry.put("version", "v1.0");
        newMetadataEntry.put("createdAt", utcTimeString);
        newMetadataEntry.put("createdBy", user);
        newMetadataEntry.put("updatedAt", utcTimeString);
        newMetadataEntry.put("updatedBy", user);

        ArrayNode metadataArray = (ArrayNode) metadata;
        metadataArray.add(newMetadataEntry);

        // File content
        ObjectNode fileContent = objectMapper.createObjectNode();
        fileContent.put("Main Prompt Content", content);
        fileContent.put("Additional Instructions", instructions);
        fileContent.set("Examples", objectMapper.valueToTree(processedExamples));

        // Commit to Bitbucket
        Map<String, String> files = Map.of(
                "metadata.json", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(metadataArray),
                filePath, objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(fileContent));
        commitFiles("Creating new template: " + name + " in " + department + "/" + appCode, files);

        // Build response
        Template t = new Template();
        t.setId(newId);
        t.setName(name);
        t.setDepartment(department);
        t.setAppCode(appCode);
        t.setContent(content);
        t.setInstructions(instructions);
        t.setExamples(toExampleList(processedExamples));
        t.setVersion("v1.0");
        t.setCreatedAt(ZonedDateTime.parse(utcTimeString).toLocalDateTime());
        t.setCreatedBy(user);
        t.setUpdatedAt(ZonedDateTime.parse(utcTimeString).toLocalDateTime());
        t.setUpdatedBy(user);
        return t;
    }

    /** 4. Update template */
    public Template updateTemplate(String id, Map<String, Object> payload) throws Exception {
        JsonNode metadata = fetchMetadata();
        ArrayNode updatedMetadata = objectMapper.createArrayNode();
        Template updatedTemplate = null;

        String updatedBy = this.username;
        String timestamp = getUtcTimeString();

        String name = (String) payload.get("name");
        String department = (String) payload.get("department");
        String appCode = (String) payload.get("appCode");
        String content = (String) payload.getOrDefault("content", "");
        String instructions = (String) payload.getOrDefault("instructions", "");
        List<Map<String, String>> processedExamples = processExamples(payload.get("examples"));

        String fileName = name.replaceAll("\\s+", "-") + ".json";
        String filePath = department + "/" + appCode + "/" + fileName;

        for (JsonNode node : metadata) {
            if (id.equals(node.path("id").asText())) {
                ObjectNode modified = (ObjectNode) node;
                modified.put("name", name);
                modified.put("Department", department);
                modified.put("AppCode", appCode);
                modified.put("version", "v1.0");
                modified.put("updatedBy", updatedBy);
                modified.put("updatedAt", timestamp);
                modified.put("link", filePath);
                updatedMetadata.add(modified);

                updatedTemplate = new Template();
                updatedTemplate.setId(id);
                updatedTemplate.setName(name);
                updatedTemplate.setDepartment(department);
                updatedTemplate.setAppCode(appCode);
                updatedTemplate.setVersion("v1.0");
                updatedTemplate.setUpdatedBy(updatedBy);
                updatedTemplate.setUpdatedAt(ZonedDateTime.parse(timestamp).toLocalDateTime());
                updatedTemplate.setCreatedBy(modified.get("createdBy").asText());
                updatedTemplate.setCreatedAt(safeParseDate(modified.get("createdAt").asText(), "createdAt"));
                updatedTemplate.setContent(content);
                updatedTemplate.setInstructions(instructions);
                updatedTemplate.setExamples(toExampleList(processedExamples));
            } else {
                updatedMetadata.add(node);
            }
        }
        if (updatedTemplate == null)
            throw new IllegalArgumentException("Template not found: " + id);

        // File content
        ObjectNode fileContent = objectMapper.createObjectNode();
        fileContent.put("Main Prompt Content", updatedTemplate.getContent());
        fileContent.put("Additional Instructions", updatedTemplate.getInstructions());
        fileContent.set("Examples", objectMapper.valueToTree(processedExamples));

        Map<String, String> files = Map.of(
                "metadata.json", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(updatedMetadata),
                filePath, objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(fileContent));
        commitFiles("Update template " + id, files);
        return updatedTemplate;
    }

    /** 5. Delete template */
    public Map<String, Object> deleteTemplate(String id, String comment) throws Exception {
        JsonNode metadata = fetchMetadata();
        ArrayNode updatedMetadata = objectMapper.createArrayNode();
        String filePath = null;
        String templateName = null;

        for (JsonNode node : metadata) {
            if (id.equals(node.path("id").asText())) {
                filePath = node.path("link").asText();
                templateName = node.path("name").asText("");
            } else {
                updatedMetadata.add(node);
            }
        }

        if (filePath == null)
            throw new IllegalArgumentException("Template not found: " + id);

        // --- Maker-checker logic: create a branch, commit, and open PR ---
        if (requireApproval) {
            String branchName = String.format("delete-template-%s-%d", id, System.currentTimeMillis());
            // 1. Create branch (Bitbucket API: refs/branches)
            createBranch(branchName);
            // 2. Commit metadata.json (remove template)
            Map<String, String> files = Map.of(
                    "metadata.json", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(updatedMetadata));
            commitFilesToBranch("Delete template metadata: " + templateName + " (ID: " + id + ")", files, branchName);
            // 3. Commit file deletion (empty file)
            Map<String, String> deleteFile = Map.of(
                    filePath, "");
            commitFilesToBranch("Delete template file: " + templateName + " (ID: " + id + ")", deleteFile, branchName);
            // 4. Create PR
            String prTitle = "Delete Template: " + templateName;
            String prDescription = String.format(
                    "Deletion request for template ID %s.\n\nRequested by: %s\nComment: %s\n\nThis PR will:\n1. Remove the template entry from metadata.json\n2. Delete the template file at %s",
                    id, username, (comment == null ? "No comment provided" : comment), filePath);
            String prUrl = createPullRequest(branchName, prTitle, prDescription);
            return Map.of(
                    "success", true,
                    "status", "pending_approval",
                    "pullRequestUrl", prUrl,
                    "message", "Deletion request submitted for approval");
        } else {
            // --- Direct delete (no approval) ---
            Map<String, String> files = Map.of(
                    "metadata.json", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(updatedMetadata),
                    filePath, "" // Bitbucket API will treat empty as delete
            );
            commitFiles("Delete template " + id + " - " + comment, files);
            return Map.of(
                    "success", true,
                    "status", "deleted",
                    "deletedId", id,
                    "message", "Template deleted successfully");
        }
    }

    // --- Helper: create branch ---
    private void createBranch(String branchName) throws Exception {
        String url = String.format("https://api.bitbucket.org/2.0/repositories/%s/%s/refs/branches", workspace,
                repoSlug);
        HttpHeaders headers = getHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String body = String.format("{\"name\":\"%s\",\"target\":{\"hash\":\"main\"}}", branchName);
        HttpEntity<String> request = new HttpEntity<>(body, headers);
        restTemplate.postForEntity(url, request, String.class);
    }

    // --- Helper: commit files to a branch ---
    private void commitFilesToBranch(String commitMessage, Map<String, String> files, String branch) throws Exception {
        String url = String.format("https://api.bitbucket.org/2.0/repositories/%s/%s/src", workspace, repoSlug);
        HttpHeaders headers = new HttpHeaders();
        String auth = java.util.Base64.getEncoder().encodeToString((username + ":" + appPassword).getBytes());
        headers.set("Authorization", "Basic " + auth);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("message", commitMessage);
        body.add("branch", branch);

        for (Map.Entry<String, String> entry : files.entrySet()) {
            String path = entry.getKey();
            String content = entry.getValue();
            body.add(path, new ByteArrayResource(content.getBytes()) {
                @Override
                public String getFilename() {
                    return path;
                }
            });
        }

        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
        restTemplate.postForEntity(url, request, String.class);
    }

    // --- Helper: create pull request ---
    private String createPullRequest(String branchName, String title, String description) throws Exception {
        String url = String.format("https://api.bitbucket.org/2.0/repositories/%s/%s/pullrequests", workspace,
                repoSlug);
        HttpHeaders headers = getHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String body = String.format(
                "{\"title\":\"%s\",\"source\":{\"branch\":{\"name\":\"%s\"}},\"destination\":{\"branch\":{\"name\":\"main\"}},\"description\":\"%s\"}",
                title.replaceAll("\"", "'"), branchName, description.replaceAll("\"", "'"));
        HttpEntity<String> request = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
        // Parse PR URL from response
        JsonNode node = objectMapper.readTree(response.getBody());
        if (node.has("links") && node.get("links").has("html")) {
            return node.get("links").get("html").get("href").asText();
        }
        return null;
    }

    /** ---- Internal helpers: Commit, Fetch, etc. ---- **/

    private void commitFiles(String commitMessage, Map<String, String> files) throws Exception {
        String url = String.format("https://api.bitbucket.org/2.0/repositories/%s/%s/src", workspace, repoSlug);
        HttpHeaders headers = new HttpHeaders();
        String auth = java.util.Base64.getEncoder().encodeToString((username + ":" + appPassword).getBytes());
        headers.set("Authorization", "Basic " + auth);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("message", commitMessage);
        body.add("branch", "main");

        for (Map.Entry<String, String> entry : files.entrySet()) {
            String path = entry.getKey();
            String content = entry.getValue();
            body.add(path, new ByteArrayResource(content.getBytes()) {
                @Override
                public String getFilename() {
                    return path;
                }
            });
        }

        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
        restTemplate.postForEntity(url, request, String.class);
    }

    private JsonNode fetchMetadata() throws Exception {
        String url = String.format("https://api.bitbucket.org/2.0/repositories/%s/%s/src/main/metadata.json", workspace,
                repoSlug);
        HttpHeaders headers = getHeaders();
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers),
                String.class);
        return objectMapper.readTree(response.getBody());
    }

    private JsonNode fetchFileContent(String filePath) throws Exception {
        String cleanPath = filePath.replaceAll("^/+", "");
        String url = String.format("https://api.bitbucket.org/2.0/repositories/%s/%s/src/main/%s", workspace, repoSlug,
                cleanPath);
        HttpHeaders headers = getHeaders();
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers),
                String.class);
        return objectMapper.readTree(response.getBody());
    }

    private HttpHeaders getHeaders() {
        HttpHeaders headers = new HttpHeaders();
        String auth = java.util.Base64.getEncoder().encodeToString((username + ":" + appPassword).getBytes());
        headers.set("Authorization", "Basic " + auth);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        return headers;
    }

    // Version history stub
    public List<Map<String, Object>> getTemplateHistory(String id) throws Exception {
        return List.of();
    }

    // Repo structure for dropdowns
    public Map<String, Object> getRepositoryStructure() throws Exception {
        JsonNode metadata = fetchMetadata();
        Set<String> departments = new TreeSet<>();
        Set<String> uniqueDeptAppCodes = new HashSet<>();
        List<Map<String, String>> appCodes = new ArrayList<>();

        for (JsonNode node : metadata) {
            if (node.has("Department")) {
                departments.add(node.get("Department").asText());
            }
            if (node.has("Department") && node.has("AppCode")) {
                String department = node.get("Department").asText();
                String appCode = node.get("AppCode").asText();
                String uniqueKey = department + "||" + appCode;
                if (uniqueDeptAppCodes.add(uniqueKey)) {
                    appCodes.add(Map.of(
                            "department", department,
                            "appCode", appCode));
                }
            }
        }
        return Map.of("departments", departments, "appCodes", appCodes);
    }

    // Webhook (optional, just a stub)
    public void handleWebhookEvent(String event, Map<String, Object> body) {
        System.out.println("Received webhook event: " + event);
    }
}
