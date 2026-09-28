package com.sdewa.coreservices.common.util;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Converts between jsonb text columns and Jackson trees. */
@Component
public class JsonText {

    private final JsonMapper mapper;

    public JsonText(JsonMapper mapper) {
        this.mapper = mapper;
    }

    public JsonNode parse(String json) {
        if (json == null || json.isBlank()) {
            return mapper.createObjectNode();
        }
        return mapper.readTree(json);
    }

    public String write(Object node) {
        return mapper.writeValueAsString(node);
    }

    public ObjectNode object() {
        return mapper.createObjectNode();
    }

    public JsonMapper mapper() {
        return mapper;
    }
}
