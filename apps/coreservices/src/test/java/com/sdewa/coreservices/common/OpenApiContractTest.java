package com.sdewa.coreservices.common;

import com.sdewa.coreservices.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.TreeMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * ADR-003 §14 / ADR-007 §5.1 contract test: the generated OpenAPI document (keys sorted, no
 * {@code servers}) must equal the committed {@code contracts/openapi/v1.json} (repo root). When it
 * differs, the new document is written to {@code build/contracts/openapi/v1.json}; review the change
 * and copy it over on purpose ({@code make contract-update}).
 */
class OpenApiContractTest extends IntegrationTest {

    private static final Path CONTRACT = Path.of("../../contracts/openapi/v1.json");
    private static final Path GENERATED = Path.of("build/contracts/openapi/v1.json");

    @Test
    void generatedOpenApiMatchesCommittedContract() throws Exception {
        JsonNode doc = body(mvc.perform(get("/v1/openapi.json")).andExpect(status().isOk()).andReturn());
        ((ObjectNode) doc).remove("servers");
        String generated = json.writerWithDefaultPrettyPrinter().writeValueAsString(canonical(doc)) + "\n";

        String committed = Files.exists(CONTRACT) ? Files.readString(CONTRACT) : "";
        if (!generated.equals(committed)) {
            Files.createDirectories(GENERATED.getParent());
            Files.writeString(GENERATED, generated);
        }
        assertThat(generated)
                .as("OpenAPI differs from contracts/openapi/v1.json; the new document is in "
                        + "apps/coreservices/%s. Review it and run `make contract-update`.", GENERATED)
                .isEqualTo(committed);
    }

    /** Object keys sorted at every level; array order is kept. */
    private JsonNode canonical(JsonNode node) {
        if (node.isObject()) {
            Map<String, JsonNode> sorted = new TreeMap<>();
            node.properties().forEach(e -> sorted.put(e.getKey(), canonical(e.getValue())));
            ObjectNode out = json.createObjectNode();
            sorted.forEach(out::set);
            return out;
        }
        if (node.isArray()) {
            ArrayNode out = json.createArrayNode();
            node.forEach(child -> out.add(canonical(child)));
            return out;
        }
        return node;
    }
}
