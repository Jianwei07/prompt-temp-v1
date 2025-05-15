package com.prompttemplate.api.service;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class BitbucketService {

    @Value("${bitbucket.workspace}")
    private String workspace;

    @Value("${bitbucket.repo}")
    private String repoSlug;

    @Value("${bitbucket.access-token}")
    private String accessToken;

    private final RestTemplate restTemplate;
    private static final String BITBUCKET_API_BASE = "https://api.bitbucket.org/2.0";

    public BitbucketService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    private HttpHeaders getAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + accessToken);
        headers.set("Accept", "application/json");
        return headers;
    }

    public List<Map<String, Object>> fetchMetadata() {
        String url = String.format("%s/repositories/%s/%s/src/main/metadata.json", 
            BITBUCKET_API_BASE, workspace, repoSlug);
        
        HttpEntity<?> request = new HttpEntity<>(getAuthHeaders());
        return restTemplate.exchange(url, HttpMethod.GET, request, List.class).getBody();
    }

    public Map<String, Object> fetchTemplateContent(String filePath) {
        String url = String.format("%s/repositories/%s/%s/src/main/%s", 
            BITBUCKET_API_BASE, workspace, repoSlug, filePath);
        
        HttpEntity<?> request = new HttpEntity<>(getAuthHeaders());
        return restTemplate.exchange(url, HttpMethod.GET, request, Map.class).getBody();
    }

    public void commit(Map<String, String> files, String message) {
        String url = String.format("%s/repositories/%s/%s/src", 
            BITBUCKET_API_BASE, workspace, repoSlug);
        
        HttpHeaders headers = getAuthHeaders();
        headers.set("Content-Type", "multipart/form-data");
        
        // TODO: Implement file commit logic using FormData
    }

    public void deleteFile(String filePath, String message) {
        String url = String.format("%s/repositories/%s/%s/src/main/%s", 
            BITBUCKET_API_BASE, workspace, repoSlug, filePath);
        
        HttpEntity<?> request = new HttpEntity<>(getAuthHeaders());
        restTemplate.exchange(url, HttpMethod.DELETE, request, Void.class);
    }
} 