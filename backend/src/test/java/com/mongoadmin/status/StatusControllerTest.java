package com.mongoadmin.status;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;

class StatusControllerTest {

    @Test
    void statusReportsTheBackendServiceContract() {
        StatusController controller = new StatusController();

        Map<String, Object> status = controller.status();

        assertThat(status)
            .containsEntry("service", "mongo-admin-backend")
            .containsEntry("status", "UP")
            .containsEntry("port", 8080);
    }
}
