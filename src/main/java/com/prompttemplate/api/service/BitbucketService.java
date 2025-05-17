package com.prompttemplate.api.service;

import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.prompttemplate.api.model.Template;

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

    @Value("${bitbucket.accessToken}")
    private String accessToken;

    public BitbucketService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /** ------------------- MAIN TEMPLATE CRUD ------------------- **/

    // 1. List all templates
    public List<Template> fetchAllTemplates() {
        try {
            JsonNode metadata = fetchMetadata();
            List<Template> result = new ArrayList<>();
            for (JsonNode node : metadata) {
                Template t = new Template();
                t.setId(node.path("id").asText());
                t.setName(node.path("name").asText());
                t.setDepartment(node.path("Department").asText());
                t.setAppCode(node.path("AppCode").asText());
                t.setVersion(node.path("version").asText("v1.0"));
                t.setCreatedAt(safeParseDate(node.path("createdAt").asText(), "createdAt"));
                t.setUpdatedAt(safeParseDate(node.path("updatedAt").asText(), "updatedAt"));
                t.setCreatedBy(node.path("createdBy").asText());
                t.setUpdatedBy(node.path("updatedBy").asText());
                result.add(t);
            }
            return result;
        } catch (Exception e) {
            e.printStackTrace();
            return Collections.emptyList();
        }
    }

    // 2. Get one template (with full content)
    public Template getTemplateById(String id) throws Exception {
        JsonNode metadata = fetchMetadata();
        for (JsonNode node : metadata) {
            if (id.equals(node.path("id").asText())) {
                String filePath = node.path("link").asText();
                JsonNode fileContent = fetchFileContent(filePath);

                Template template = new Template();
                template.setId(id);
                template.setName(node.path("name").asText());
                template.setDepartment(node.path("Department").asText());
                template.setAppCode(node.path("AppCode").asText());
                template.setVersion(node.path("version").asText("v1.0"));
                template.setCreatedAt(safeParseDate(node.path("createdAt").asText(), "createdAt"));
                template.setUpdatedAt(safeParseDate(node.path("updatedAt").asText(), "updatedAt"));
                template.setCreatedBy(node.path("createdBy").asText());
                template.setUpdatedBy(node.path("updatedBy").asText());
                template.setContent(fileContent.path("Main Prompt Content").asText());
                template.setInstructions(fileContent.path("Additional Instructions").asText());

                List<Template.Example> examples = objectMapper.convertValue(
                        fileContent.get("Examples"),
                        new TypeReference<>() {
                        });
                template.setExamples(examples);

                return template;
            }
        }
        return null;
    }

    // 3. Create template
public Template createTemplate(Map<String, Object> payload) throws Exception {
    String id = UUID.randomUUID().toString();
    String now = ZonedDateTime.now().toString();

    ObjectNode newNode = objectMapper.createObjectNode();
    newNode.put("id", id);
    newNode.put("name", (String) payload.get("name"));
    newNode.put("Department", (String) payload.get("department"));
    newNode.put("AppCode", (String) payload.get("appCode"));
    newNode.put("version", (String) payload.getOrDefault("version", "v1.0"));
    newNode.put("createdBy", (String) payload.getOrDefault("createdBy", username));
    newNode.put("updatedBy", (String) payload.getOrDefault("createdBy", username));
    newNode.put("createdAt", now);
    newNode.put("updatedAt", now);
    newNode.put("link", "templates/" + id + ".json");

    ArrayNode metadata = (ArrayNode) fetchMetadata();
    metadata.add(newNode);

    ObjectNode fileContent = objectMapper.createObjectNode();
    fileContent.put("Main Prompt Content", (String) payload.getOrDefault("content", ""));
    fileContent.put("Additional Instructions", (String) payload.getOrDefault("instructions", ""));
    fileContent.set("Examples", objectMapper.valueToTree(payload.getOrDefault("examples", List.of())));

    Map<String, String> files = Map.of(
            "metadata.json", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(metadata),
            "templates/" + id + ".json",
            objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(fileContent));

    commitFiles("Create template " + id, files);

    Template created = new Template();
    created.setId(id);
    created.setName(newNode.get("name").asText());
    created.setDepartment(newNode.get("Department").asText());
    created.setAppCode(newNode.get("AppCode").asText());
    created.setVersion(newNode.get("version").asText());
    created.setCreatedAt(ZonedDateTime.parse(now).toLocalDateTime());
    created.setUpdatedAt(ZonedDateTime.parse(now).toLocalDateTime());
    created.setCreatedBy(username);
    created.setUpdatedBy(username);
    created.setContent(fileContent.get("Main Prompt Content").asText());
    created.setInstructions(fileContent.get("Additional Instructions").asText());
    created.setExamples(objectMapper.convertValue(fileContent.get("Examples"), new TypeReference<>() {
    }));
    return created;
}

    // 4. Update template
    public Template updateTemplate(String id, Map<String, Object> payload) throws Exception {
        JsonNode metadata = fetchMetadata();
        ArrayNode updatedMetadata = objectMapper.createArrayNode();
        Template updatedTemplate = null;

        String updatedBy = (String) payload.getOrDefault("updatedBy", username);
        String timestamp = ZonedDateTime.now().toString();

        for (JsonNode node : metadata) {
            if (id.equals(node.path("id").asText())) {
                ObjectNode modified = (ObjectNode) node;
                modified.put("name", (String) payload.get("name"));
                modified.put("Department", (String) payload.get("department"));
                modified.put("AppCode", (String) payload.get("appCode"));
                modified.put("version", (String) payload.getOrDefault("version", "v1.0"));
                modified.put("updatedBy", updatedBy);
                modified.put("updatedAt", timestamp);
                updatedMetadata.add(modified);

                updatedTemplate = new Template();
                updatedTemplate.setId(id);
                updatedTemplate.setName(modified.get("name").asText());
                updatedTemplate.setDepartment(modified.get("Department").asText());
                updatedTemplate.setAppCode(modified.get("AppCode").asText());
                updatedTemplate.setVersion(modified.get("version").asText());
                updatedTemplate.setUpdatedBy(updatedBy);
                updatedTemplate.setUpdatedAt(ZonedDateTime.parse(timestamp).toLocalDateTime());
                updatedTemplate.setCreatedBy(modified.get("createdBy").asText());
                updatedTemplate.setCreatedAt(safeParseDate(modified.get("createdAt").asText(), "createdAt"));
                updatedTemplate.setContent((String) payload.getOrDefault("content", ""));
                updatedTemplate.setInstructions((String) payload.getOrDefault("instructions", ""));
                updatedTemplate.setExamples(
                        objectMapper.convertValue(payload.getOrDefault("examples", List.of()), new TypeReference<>() {
                        }));
            } else {
                updatedMetadata.add(node);
            }
        }

        if (updatedTemplate == null)
            throw new IllegalArgumentException("Template not found: " + id);

        String filePath = "templates/" + id + ".json";
        ObjectNode fileContent = objectMapper.createObjectNode();
        fileContent.put("Main Prompt Content", updatedTemplate.getContent());
        fileContent.put("Additional Instructions", updatedTemplate.getInstructions());
        fileContent.set("Examples", objectMapper.valueToTree(updatedTemplate.getExamples()));

        Map<String, String> files = Map.of(
                "metadata.json", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(updatedMetadata),
                filePath, objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(fileContent));

        commitFiles("Update template " + id, files);
        return updatedTemplate;
    }

    // 5. Delete template
    public Map<String, Object> deleteTemplate(String id, String comment) throws Exception {
        JsonNode metadata = fetchMetadata();
        ArrayNode updatedMetadata = objectMapper.createArrayNode();
        String filePath = null;

        for (JsonNode node : metadata) {
            if (id.equals(node.path("id").asText())) {
                filePath = node.path("link").asText();
            } else {
                updatedMetadata.add(node);
            }
        }

        if (filePath == null)
            throw new IllegalArgumentException("Template not found: " + id);

        Map<String, String> files = Map.of(
                "metadata.json", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(updatedMetadata),
                filePath, "" // deleting file
        );

        commitFiles("Delete template " + id + " - " + comment, files);
        return Map.of("success", true, "deletedId", id);
    }
    // 6. Get AppCodes
    public List<String> getAppCodesByDepartment(String department) throws Exception {
    ArrayNode metadata = (ArrayNode) fetchMetadata();
    Set<String> appCodes = new TreeSet<>();

    for (JsonNode node : metadata) {
        if (node.has("Department") && department.equals(node.get("Department").asText())) {
            if (node.has("AppCode")) {
                appCodes.add(node.get("AppCode").asText());
            }
        }
    }
    return new ArrayList<>(appCodes);
}

    /** ------------- Ancillary (used by FE for dropdowns, etc) -------------- **/

    public Map<String, Object> getRepositoryStructure() throws Exception {
        JsonNode metadata = fetchMetadata();
        Set<String> departments = new TreeSet<>();
        Set<String> appCodes = new TreeSet<>();

        for (JsonNode node : metadata) {
            if (node.has("Department")) {
                departments.add(node.get("Department").asText());
            }
            if (node.has("AppCode")) {
                appCodes.add(node.get("AppCode").asText());
            }
        }

        return Map.of("departments", departments, "appCodes", appCodes);
    }

    /** ---------- Internal helper: Commit changes to Bitbucket ---------- **/

    private void commitFiles(String commitMessage, Map<String, String> files) throws Exception {
        String url = String.format("https://api.bitbucket.org/2.0/repositories/%s/%s/src", workspace, repoSlug);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
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

    /** ---------- Internal helpers: fetch metadata & content ---------- **/

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
        headers.setBearerAuth(accessToken);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        return headers;
    }

    /** ---- Optionally: Stub for version history if frontend expects it ---- **/
    public List<Map<String, Object>> getTemplateHistory(String id) throws Exception {
        // Not implemented
        return List.of();
    }

    

    @SuppressWarnings("unchecked")
    public void handleWebhookEvent(String event, Map<String, Object> body) {
        if (!"pullrequest:fulfilled".equals(event))
            return;

        try {
            Map<String, Object> pr = (Map<String, Object>) body.get("pullrequest");
            Map<String, Object> source = (Map<String, Object>) pr.get("source");
            Map<String, Object> branch = (Map<String, Object>) source.get("branch");
            String branchName = (String) branch.get("name");

            if (branchName.startsWith("delete-template-")) {
                String[] parts = branchName.split("delete-template-");
                if (parts.length > 1) {
                    String templatePath = parts[1].replace("-", "/").replace("_", "-") + ".json";
                    // Call your file deletion logic here if you want
                    // deleteFilesAfterPR(templatePath);
                    System.out.println("Deleted template file after PR merge: " + templatePath);
                }
            }
        } catch (Exception e) {
            e.printStackTrace(); // Just log
        }
    }
}

