@RestController
@RequestMapping("/api")
public class BitbucketController {

    @Value("${bitbucket.accessToken}")
    private String accessToken;

    @Value("${bitbucket.workspace}")
    private String workspace;

    @Value("${bitbucket.repoSlug}")
    private String repoSlug;

    @GetMapping("/time/singapore")
    public ResponseEntity<String> getSingaporeTime() {
        ZonedDateTime time = ZonedDateTime.now(ZoneId.of("Asia/Singapore"));
        return ResponseEntity.ok(time.toString());
    }

    private HttpHeaders getAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + accessToken);
        headers.set("Accept", "application/json");
        return headers;
    }

    @PostMapping("/bitbucket/commit")
    public ResponseEntity<String> commit(@RequestBody Map<String, String> files, 
                                         @RequestParam String message, 
                                         @RequestParam(required = false, defaultValue = "main") String branch) {
        try {
            MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
            formData.add("branch", branch);
            formData.add("message", message);
            files.forEach(formData::add);

            HttpHeaders headers = getAuthHeaders();
            HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(formData, headers);
            RestTemplate restTemplate = new RestTemplate();

            ResponseEntity<String> response = restTemplate.postForEntity(
                "https://api.bitbucket.org/2.0/repositories/" + workspace + "/" + repoSlug + "/src",
                requestEntity, String.class);

            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping("/bitbucket/delete")
    public ResponseEntity<String> deleteFile(@RequestParam String filePath, 
                                             @RequestParam String branch, 
                                             @RequestParam String message) {
        try {
            HttpHeaders headers = getAuthHeaders();
            headers.set("Content-Type", "application/json");

            Map<String, String> body = Map.of("message", message, "branch", branch);
            HttpEntity<Map<String, String>> requestEntity = new HttpEntity<>(body, headers);
            RestTemplate restTemplate = new RestTemplate();

            ResponseEntity<String> response = restTemplate.exchange(
                "https://api.bitbucket.org/2.0/repositories/" + workspace + "/" + repoSlug + "/src/" + branch + "/" + filePath,
                HttpMethod.DELETE, requestEntity, String.class);

            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error: " + e.getMessage());
        }
    }
}
