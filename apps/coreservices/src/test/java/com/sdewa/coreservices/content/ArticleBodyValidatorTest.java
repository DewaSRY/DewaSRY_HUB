package com.sdewa.coreservices.content;

import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.error.ErrorReason;
import com.sdewa.coreservices.common.error.FieldErrorItem;
import com.sdewa.coreservices.content.body.ArticleBodyValidator;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * ADR-009 §8 API contract test: the validator accepts the shared kitchen-sink fixture unchanged and
 * rejects every invalid fixture in {@code contracts/article/invalid} (repo root) with 400 at the
 * expected path. Also covers the normalisation fixture (unknown attributes are dropped).
 */
class ArticleBodyValidatorTest {

    private static final Path CONTRACTS = Path.of("../../contracts/article");
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final ArticleBodyValidator validator = new ArticleBodyValidator(mapper);

    private JsonNode read(Path p) throws Exception {
        return mapper.readTree(Files.readString(p));
    }

    @Test
    void acceptsKitchenSinkAndOnlyDropsNullAttributes() throws Exception {
        JsonNode doc = read(CONTRACTS.resolve("kitchen-sink.v1.json"));
        ArticleBodyValidator.Result result = validator.validate(doc);
        assertThat(result.doc()).isEqualTo(withoutNullAttrs(doc.deepCopy()));
        assertThat(result.imageIds()).hasSize(3);
        assertThat(result.wordCount()).isGreaterThan(50);
        assertThat(result.bodyText()).contains("Why Graviton").contains("t4g.small").doesNotContain("dQw4w9WgXcQ");
    }

    @Test
    void normalisationDropsUnknownAttributes() throws Exception {
        JsonNode input = read(CONTRACTS.resolve("normalize/unknown-attributes.input.json"));
        JsonNode expected = read(CONTRACTS.resolve("normalize/unknown-attributes.expected.json"));
        assertThat(validator.validate(input).doc()).isEqualTo(expected);
    }

    @TestFactory
    List<DynamicTest> rejectsEveryInvalidFixture() throws Exception {
        JsonNode index = read(CONTRACTS.resolve("invalid/index.json"));
        List<DynamicTest> tests = new ArrayList<>();
        for (JsonNode f : index.get("fixtures")) {
            String file = f.get("file").stringValue();
            String expectedPath = f.get("expectedPath").stringValue();
            tests.add(DynamicTest.dynamicTest(file, () -> {
                JsonNode doc = read(CONTRACTS.resolve("invalid").resolve(file));
                assertThatThrownBy(() -> validator.validate(doc))
                        .isInstanceOfSatisfying(ApiException.class, e -> {
                            assertThat(e.reason()).isEqualTo(ErrorReason.VALIDATION_FAILED);
                            assertThat(e.reason().status().value()).isEqualTo(400);
                            assertThat(e.errors()).extracting(FieldErrorItem::field).contains(expectedPath);
                        });
            }));
        }
        assertThat(tests).hasSizeGreaterThanOrEqualTo(20);
        return tests;
    }

    @Test
    void rejectsJavascriptLinksInAnyCase() {
        for (String href : List.of("javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "java\tscript:alert(1)",
                "vbscript:x", "data:text/html,x", "//evil.example", "/\\evil.example", "file:///etc/passwd")) {
            assertThat(ArticleBodyValidator.isSafeHref(href)).as(href).isFalse();
        }
        for (String href : List.of("https://example.com", "http://example.com/a?b=c", "mailto:a@b.co", "/about", "#setup")) {
            assertThat(ArticleBodyValidator.isSafeHref(href)).as(href).isTrue();
        }
    }

    @Test
    void rejectsUnknownNodeWithPath() {
        ObjectNode doc = doc();
        ((ArrayNode) doc.get("content")).addObject().put("type", "iframe").putObject("attrs").put("src", "https://evil");
        assertThatThrownBy(() -> validator.validate(doc)).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.errors().getFirst().field()).isEqualTo("body.content[0]"));
    }

    @Test
    void rejectsTableWith21Columns() {
        ObjectNode doc = doc();
        ObjectNode row = ((ArrayNode) doc.get("content")).addObject().put("type", "table").putArray("content").addObject().put("type", "tableRow");
        ArrayNode cells = row.putArray("content");
        for (int i = 0; i < 21; i++) {
            cells.addObject().put("type", "tableCell").putArray("content").addObject().put("type", "paragraph");
        }
        assertThatThrownBy(() -> validator.validate(doc)).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.errors()).extracting(FieldErrorItem::message).anyMatch(m -> m.contains("20 columns")));
    }

    @Test
    void rejectsBodyOver512Kb() {
        ObjectNode doc = doc();
        ((ArrayNode) doc.get("content")).addObject().put("type", "paragraph").putArray("content")
                .addObject().put("type", "text").put("text", "x".repeat(520 * 1024));
        assertThatThrownBy(() -> validator.validate(doc)).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.errors().getFirst().field()).isEqualTo("body"));
    }

    @Test
    void derivesTextWordCountAndImages() {
        ObjectNode doc = doc();
        ArrayNode content = (ArrayNode) doc.get("content");
        content.addObject().put("type", "heading").<ObjectNode>set("attrs", mapper.createObjectNode().put("level", 2))
                .putArray("content").addObject().put("type", "text").put("text", "Hello world");
        content.addObject().put("type", "paragraph").putArray("content").addObject().put("type", "text").put("text", "one two three");
        UUID img = UUID.randomUUID();
        content.addObject().put("type", "image").putObject("attrs").put("imageId", img.toString());
        ArticleBodyValidator.Result r = validator.validate(doc);
        assertThat(r.bodyText()).isEqualTo("Hello world\none two three");
        assertThat(r.wordCount()).isEqualTo(5);
        assertThat(r.imageIds()).containsExactly(img);
    }

    /** The normalize fixture drops {@code null} attributes; everything else in the kitchen sink is kept. */
    private static JsonNode withoutNullAttrs(JsonNode node) {
        if (node.isObject()) {
            JsonNode attrs = node.get("attrs");
            if (attrs != null && attrs.isObject()) {
                List<String> nulls = new ArrayList<>();
                attrs.properties().forEach(e -> {
                    if (e.getValue().isNull()) {
                        nulls.add(e.getKey());
                    }
                });
                nulls.forEach(((ObjectNode) attrs)::remove);
                if (attrs.isEmpty()) {
                    ((ObjectNode) node).remove("attrs");
                }
            }
            node.forEach(ArticleBodyValidatorTest::withoutNullAttrs);
        } else if (node.isArray()) {
            node.forEach(ArticleBodyValidatorTest::withoutNullAttrs);
        }
        return node;
    }

    private ObjectNode doc() {
        ObjectNode doc = mapper.createObjectNode();
        doc.put("type", "doc");
        doc.putArray("content");
        return doc;
    }
}
