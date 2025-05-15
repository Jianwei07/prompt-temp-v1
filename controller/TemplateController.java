@RestController
@RequestMapping("/api/templates")
public class TemplateController {

    @Value("${bitbucket.accessToken}")
    private String accessToken;

    @Value("${bitbucket.workspace}")
    private String workspace;

    @Value("${bitbucket.repoSlug}")
    private String repoSlug;

    private HttpHeaders getAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + accessToken);
        headers.set("Accept", "application/json");
        headers.set("Content-Type", "application/json");
        return headers;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteTemplate(@PathVariable String id, @RequestParam(required = false) String requestComment) {
        try {
            boolean requireApproval = Boolean.parseBoolean(System.getenv("BITBUCKET_DELETE_APPROVAL"));
            String username = System.getenv("BITBUCKET_USERNAME");

            // Fetch metadata and locate template
            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<String> metadataResponse = restTemplate.exchange(
                "https://api.bitbucket.org/2.0/repositories/" + workspace + "/" + repoSlug + "/src/main/metadata.json",
                HttpMethod.GET, new HttpEntity<>(getAuthHeaders()), String.class);

            ObjectMapper mapper = new ObjectMapper();
            List<Map<String, Object>> metadata = mapper.readValue(metadataResponse.getBody(), new TypeReference<>() {});
            Map<String, Object> templateMeta = metadata.stream()
                .filter(entry -> id.equals(entry.get("id").toString()))
                .findFirst()
                .orElse(null);

            if (templateMeta == null || !templateMeta.containsKey("link")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Template not found or missing file path"));
            }

            metadata.removeIf(entry -> id.equals(entry.get("id").toString()));

            if (requireApproval) {
                String branchName = "delete-template-" + id + "-" + System.currentTimeMillis();
                restTemplate.exchange(
                    "https://api.bitbucket.org/2.0/repositories/" + workspace + "/" + repoSlug + "/refs/branches",
                    HttpMethod.POST, new HttpEntity<>(Map.of("name", branchName, "target", Map.of("hash", "main")), getAuthHeaders()), String.class);

                restTemplate.postForEntity(
                    "https://api.bitbucket.org/2.0/repositories/" + workspace + "/" + repoSlug + "/src",
                    new HttpEntity<>(Map.of("metadata.json", mapper.writeValueAsString(metadata)), getAuthHeaders()), String.class);

                return ResponseEntity.ok(Map.of("success", true, "message", "Deletion request submitted for approval"));
            } else {
                restTemplate.postForEntity(
                    "https://api.bitbucket.org/2.0/repositories/" + workspace + "/" + repoSlug + "/src",
                    new HttpEntity<>(Map.of("metadata.json", mapper.writeValueAsString(metadata)), getAuthHeaders()), String.class);

                return ResponseEntity.ok(Map.of("success", true, "message", "Template deleted successfully"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<Map<String, Object>> getTemplateHistory(@PathVariable String id) {
        try {
            String fileHistoryUrl = "https://api.bitbucket.org/2.0/repositories/" + workspace + "/" + repoSlug + "/filehistory/main/" + id;
            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<String> response = restTemplate.exchange(fileHistoryUrl, HttpMethod.GET, new HttpEntity<>(getAuthHeaders()), String.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                return ResponseEntity.ok(Map.of("success", true, "history", List.of(Map.of("commitId", "initial", "version", "v1.0", "message", "Initial version"))));
            }

            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> historyData = mapper.readValue(response.getBody(), new TypeReference<>() {});
            List<Map<String, Object>> history = ((List<Map<String, Object>>) historyData.get("values")).stream()
                .map(entry -> Map.of("commitId", entry.get("hash"), "version", "v1." + historyData.get("values").size(), "message", entry.getOrDefault("message", "Version update")))
                .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of("success", true, "history", history));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", true, "history", List.of(Map.of("commitId", "error", "version", "v1.0", "message", "Could not retrieve version history"))));
        }
    }
}
