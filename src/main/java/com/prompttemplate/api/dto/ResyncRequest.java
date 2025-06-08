package com.prompttemplate.api.dto;

public class ResyncRequest {
    private boolean dryRun;

    public boolean isDryRun() {
        return dryRun;
    }

    public void setDryRun(boolean dryRun) {
        this.dryRun = dryRun;
    }
}
