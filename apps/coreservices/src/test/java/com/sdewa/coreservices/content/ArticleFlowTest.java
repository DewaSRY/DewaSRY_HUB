package com.sdewa.coreservices.content;

import com.sdewa.coreservices.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** UC-16 / UC-17 / UC-18 / UC-20 and the public reads (UC-01, UC-03). */
class ArticleFlowTest extends IntegrationTest {

    private static final String BODY = """
            {"type":"doc","content":[
              {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Why Graviton"}]},
              {"type":"paragraph","content":[{"type":"text","text":"It is cheaper than x86 and just as fast."}]}
            ]}""";

    private String category(String name) throws Exception {
        MvcResult r = mvc.perform(post("/v1/admin/categories").header("Authorization", adminBearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"" + name + "\"}"))
                .andExpect(status().isCreated()).andReturn();
        return body(r).path("data").path("id").stringValue();
    }

    private String tag(String name) throws Exception {
        MvcResult r = mvc.perform(post("/v1/admin/tags").header("Authorization", adminBearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"" + name + "\"}"))
                .andExpect(status().isCreated()).andReturn();
        return body(r).path("data").path("id").stringValue();
    }

    private JsonNode createArticle(String json) throws Exception {
        MvcResult r = mvc.perform(post("/v1/admin/articles").header("Authorization", adminBearer())
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andReturn();
        return body(r).path("data");
    }

    /** A create body with one Indonesian translation. */
    private static String titleOnly(String title) {
        return "{\"translations\":{\"id\":{\"title\":\"" + title + "\"}}}";
    }

    private static String titleOnly(String title, String slug) {
        return "{\"slug\":\"" + slug + "\",\"translations\":{\"id\":{\"title\":\"" + title + "\"}}}";
    }

    private static String translation(String title, String excerpt) {
        return """
                {"title":"%s","excerpt":%s,"body":%s,"bodySchemaVersion":1,"metaTitle":null,"metaDescription":null}
                """.formatted(title, excerpt == null ? "null" : "\"" + excerpt + "\"", BODY);
    }

    private String fullInput(String title, String slug, String categoryId, String tagId, int version) {
        return """
                {"slug":"%s","translations":{"id":%s},"categoryId":"%s","tagIds":["%s"],"version":%d}
                """.formatted(slug, translation(title, "Short excerpt"), categoryId, tagId, version);
    }

    @Test
    void createDraftPublishReadRenameAndRedirect() throws Exception {
        String cat = category("DevOps");
        String tag = tag("AWS");

        // Create: always DRAFT, slug generated from the title, Location header.
        MvcResult created = mvc.perform(post("/v1/admin/articles").header("Authorization", adminBearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"translations\":{\"id\":{\"title\":\"Deploy Spring Boot on Graviton!\",\"body\":" + BODY + "}}}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", startsWith("/v1/admin/articles/")))
                .andExpect(jsonPath("$.code").value(201))
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.slug").value("deploy-spring-boot-on-graviton"))
                .andExpect(jsonPath("$.data.version").value(0))
                .andExpect(jsonPath("$.data.locales[0]").value("id"))
                .andExpect(jsonPath("$.data.title").value("Deploy Spring Boot on Graviton!"))
                .andExpect(jsonPath("$.data.translations.id.wordCount").value(11))
                .andExpect(jsonPath("$.data.translations.id.body.type").value("doc"))
                .andExpect(jsonPath("$.data.translations.id.bodySchemaVersion").value(1))
                .andReturn();
        String id = body(created).path("data").path("id").stringValue();

        // Drafts are not public.
        mvc.perform(get("/v1/public/articles/deploy-spring-boot-on-graviton")).andExpect(status().isNotFound());

        // Publish while incomplete → 422 with the missing fields.
        mvc.perform(post("/v1/admin/articles/" + id + "/publish").header("Authorization", adminBearer()))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value(422))
                .andExpect(jsonPath("$.error[*].field", hasItem("translations.id.excerpt")))
                .andExpect(jsonPath("$.error[*].field", hasItem("categoryId")));

        // Complete it (PUT with the current version).
        mvc.perform(put("/v1/admin/articles/" + id).header("Authorization", adminBearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(fullInput("Deploy Spring Boot on Graviton", "deploy-spring-boot-on-graviton", cat, tag, 0)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.version").value(1))
                .andExpect(jsonPath("$.data.revalidation").isEmpty());

        // Stale version → 409 VERSION_CONFLICT.
        mvc.perform(put("/v1/admin/articles/" + id).header("Authorization", adminBearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(fullInput("Other tab", "deploy-spring-boot-on-graviton", cat, tag, 0)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("changed by someone else")));

        // Publish → sets publishedAt, revalidation reported.
        mvc.perform(post("/v1/admin/articles/" + id + "/publish").header("Authorization", adminBearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.data.publishedAt").isNotEmpty())
                .andExpect(jsonPath("$.data.revalidation.status").value("OK"))
                .andExpect(jsonPath("$.data.revalidation.paths", hasItem("/blog/deploy-spring-boot-on-graviton")))
                .andExpect(jsonPath("$.data.revalidation.paths", hasItem("/sitemap.xml")));
        // Idempotent.
        mvc.perform(post("/v1/admin/articles/" + id + "/publish").header("Authorization", adminBearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.revalidation").isEmpty());

        // Public read.
        mvc.perform(get("/v1/public/articles/deploy-spring-boot-on-graviton"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Deploy Spring Boot on Graviton"))
                .andExpect(jsonPath("$.data.body.content[0].type").value("heading"))
                .andExpect(jsonPath("$.data.bodySchemaVersion").value(1))
                .andExpect(jsonPath("$.data.images").isMap())
                .andExpect(jsonPath("$.data.readingMinutes").value(1))
                .andExpect(jsonPath("$.data.metaTitle").value("Deploy Spring Boot on Graviton"))
                .andExpect(jsonPath("$.data.metaDescription").value("Short excerpt"))
                .andExpect(jsonPath("$.data.locale").value("id"))
                .andExpect(jsonPath("$.data.availableLocales[0]").value("id"))
                .andExpect(jsonPath("$.data.canonicalUrl").value("https://hub.test/id/blog/deploy-spring-boot-on-graviton"))
                .andExpect(jsonPath("$.data.category.slug").value("devops"))
                .andExpect(jsonPath("$.data.tags[0].slug").value("aws"))
                .andExpect(jsonPath("$.data.bodyHtml").doesNotExist());
        mvc.perform(get("/v1/public/articles?category=devops"))
                .andExpect(jsonPath("$.meta.total").value(1))
                .andExpect(jsonPath("$.data[0].slug").value("deploy-spring-boot-on-graviton"));
        mvc.perform(get("/v1/public/articles?tag=nope")).andExpect(status().isOk()).andExpect(jsonPath("$.meta.total").value(0));
        mvc.perform(get("/v1/public/categories")).andExpect(jsonPath("$.data[0].articleCount").value(1));
        mvc.perform(get("/v1/public/categories/devops")).andExpect(jsonPath("$.data.name").value("DevOps"));
        mvc.perform(get("/v1/public/categories/unknown")).andExpect(status().isNotFound());
        mvc.perform(get("/v1/public/tags/aws")).andExpect(jsonPath("$.data.articleCount").value(1));
        mvc.perform(get("/v1/public/sitemap"))
                .andExpect(jsonPath("$.data.articles[0].slug").value("deploy-spring-boot-on-graviton"))
                .andExpect(jsonPath("$.data.articles[0].locales[0]").value("id"))
                .andExpect(jsonPath("$.data.categories[0].slug").value("devops"))
                .andExpect(jsonPath("$.data.tags[0].slug").value("aws"));

        // Rename the slug of the published article → old slug answers 301.
        mvc.perform(put("/v1/admin/articles/" + id).header("Authorization", adminBearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(fullInput("Deploy Spring Boot on Graviton", "spring-boot-graviton", cat, tag, 2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.previousSlugs[0]").value("deploy-spring-boot-on-graviton"))
                .andExpect(jsonPath("$.data.revalidation.paths", hasItem("/blog/deploy-spring-boot-on-graviton")))
                .andExpect(jsonPath("$.data.revalidation.paths", hasItem("/blog/spring-boot-graviton")));
        mvc.perform(get("/v1/public/articles/deploy-spring-boot-on-graviton"))
                .andExpect(status().isMovedPermanently())
                .andExpect(header().string("Location", "/v1/public/articles/spring-boot-graviton"))
                .andExpect(jsonPath("$.code").value(301))
                .andExpect(jsonPath("$.data.slug").value("spring-boot-graviton"));

        // A new article cannot take the old slug (409 SLUG_TAKEN), nor the current one.
        mvc.perform(post("/v1/admin/articles").header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content(titleOnly("x", "deploy-spring-boot-on-graviton")))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value("The slug is already used"));
        mvc.perform(post("/v1/admin/articles").header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content(titleOnly("x", "spring-boot-graviton")))
                .andExpect(status().isConflict());

        // Taking back its own old slug removes the redirect row.
        mvc.perform(put("/v1/admin/articles/" + id).header("Authorization", adminBearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(fullInput("Deploy Spring Boot on Graviton", "deploy-spring-boot-on-graviton", cat, tag, 3)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.previousSlugs[0]").value("spring-boot-graviton"));
        mvc.perform(get("/v1/public/articles/deploy-spring-boot-on-graviton")).andExpect(status().isOk());

        // Admin list filters.
        mvc.perform(get("/v1/admin/articles?status=PUBLISHED&q=graviton&sort=title,asc").header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.meta.total").value(1));
        mvc.perform(get("/v1/admin/articles?tag=" + tag).header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.meta.total").value(1));
        mvc.perform(get("/v1/admin/articles?sort=nope").header("Authorization", adminBearer())).andExpect(status().isBadRequest());

        // Category in use → 409 with the count.
        mvc.perform(delete("/v1/admin/categories/" + cat).header("Authorization", adminBearer()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("1 article")));

        // Unpublish → gone from the public site.
        mvc.perform(post("/v1/admin/articles/" + id + "/unpublish").header("Authorization", adminBearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.publishedAt").isNotEmpty());
        mvc.perform(get("/v1/public/articles/deploy-spring-boot-on-graviton")).andExpect(status().isNotFound());
        mvc.perform(get("/v1/public/articles/spring-boot-graviton")).andExpect(status().isNotFound());

        // Delete.
        mvc.perform(delete("/v1/admin/articles/" + id).header("Authorization", adminBearer())).andExpect(status().isNoContent());
        mvc.perform(get("/v1/admin/articles/" + id).header("Authorization", adminBearer())).andExpect(status().isNotFound());
        mvc.perform(delete("/v1/admin/categories/" + cat).header("Authorization", adminBearer())).andExpect(status().isNoContent());
    }

    @Test
    void generatedSlugsGetSuffixAndExplicitSlugIsValidated() throws Exception {
        assertThat(createArticle(titleOnly("Hello World")).path("slug").stringValue()).isEqualTo("hello-world");
        assertThat(createArticle(titleOnly("Hello, World")).path("slug").stringValue()).isEqualTo("hello-world-2");
        mvc.perform(post("/v1/admin/articles").header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content(titleOnly("x", "Bad Slug")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error[0].field").value("slug"));
        mvc.perform(post("/v1/admin/articles").header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"no-title\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error[0].field").value("translations"));
        mvc.perform(post("/v1/admin/articles").header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"translations\":{\"id\":{\"title\":\" \"},\"fr\":{\"title\":\"Bonjour\"}}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error[*].field", hasItem("translations.id.title")))
                .andExpect(jsonPath("$.error[*].field", hasItem("translations.fr")));
    }

    @Test
    void bodyIsValidatedAgainstTheAllowlist() throws Exception {
        String js = """
                {"translations":{"en":{"title":"x","body":{"type":"doc","content":[{"type":"paragraph","content":[
                  {"type":"text","text":"click","marks":[{"type":"link","attrs":{"href":"javascript:alert(1)"}}]}]}]}}}}""";
        mvc.perform(post("/v1/admin/articles").header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON).content(js))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.error[0].field").value("translations.en.body.content[0].content[0].marks[0].attrs.href"));

        String missingImage = """
                {"translations":{"id":{"title":"x","body":{"type":"doc","content":[{"type":"image","attrs":{"imageId":"%s"}}]}}}}""".formatted(UUID.randomUUID());
        mvc.perform(post("/v1/admin/articles").header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON).content(missingImage))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error[0].field").value("translations.id.body"))
                .andExpect(jsonPath("$.error[0].message").value(containsString("does not exist")));

        String sanitized = """
                {"translations":{"id":{"title":"sanitized","body":{"type":"doc","content":[{"type":"paragraph","attrs":{"onclick":"x"},
                  "content":[{"type":"text","text":"hi","marks":[{"type":"link","attrs":{"href":"https://a.io","target":"_blank"}}]}]}]}}}}""";
        JsonNode body = createArticle(sanitized).path("translations").path("id").path("body");
        assertThat(body.path("content").get(0).has("attrs")).isFalse();
        assertThat(body.path("content").get(0).path("content").get(0).path("marks").get(0).path("attrs").has("target")).isFalse();
    }

    @Test
    void translationsArePerLanguageWithFallback() throws Exception {
        String cat = category("Cloud");
        String tag = tag("Kubernetes");

        // Indonesian only, published.
        JsonNode created = createArticle("""
                {"slug":"kubernetes-dasar","translations":{"id":%s},"categoryId":"%s","tagIds":["%s"]}
                """.formatted(translation("Dasar Kubernetes", "Ringkasan"), cat, tag));
        String id = created.path("id").stringValue();
        mvc.perform(post("/v1/admin/articles/" + id + "/publish").header("Authorization", adminBearer()))
                .andExpect(status().isOk());

        // English is requested but missing → the Indonesian text, canonical to /id.
        mvc.perform(get("/v1/public/articles/kubernetes-dasar?locale=en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.locale").value("id"))
                .andExpect(jsonPath("$.data.title").value("Dasar Kubernetes"))
                .andExpect(jsonPath("$.data.canonicalUrl").value("https://hub.test/id/blog/kubernetes-dasar"));
        mvc.perform(get("/v1/public/articles/kubernetes-dasar?locale=xx")).andExpect(status().isBadRequest());
        mvc.perform(get("/v1/admin/articles?missingLocale=en").header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.meta.total").value(1));

        // Adding English to a published article needs its excerpt.
        mvc.perform(put("/v1/admin/articles/" + id).header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"slug":"kubernetes-dasar","translations":{"id":%s,"en":%s},"categoryId":"%s","tagIds":["%s"],"version":1}
                                """.formatted(translation("Dasar Kubernetes", "Ringkasan"), translation("Kubernetes Basics", null), cat, tag)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error[0].field").value("translations.en.excerpt"));
        mvc.perform(put("/v1/admin/articles/" + id).header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"slug":"kubernetes-dasar","translations":{"en":%s,"id":%s},"categoryId":"%s","tagIds":["%s"],"version":1}
                                """.formatted(translation("Kubernetes Basics", "Summary"), translation("Dasar Kubernetes", "Ringkasan"), cat, tag)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.version").value(2))
                .andExpect(jsonPath("$.data.locales[0]").value("id"))
                .andExpect(jsonPath("$.data.locales[1]").value("en"))
                .andExpect(jsonPath("$.data.title").value("Dasar Kubernetes"))
                .andExpect(jsonPath("$.data.translations.en.title").value("Kubernetes Basics"))
                .andExpect(jsonPath("$.data.revalidation.paths", hasItem("/blog/kubernetes-dasar")));

        mvc.perform(get("/v1/public/articles/kubernetes-dasar?locale=en"))
                .andExpect(jsonPath("$.data.locale").value("en"))
                .andExpect(jsonPath("$.data.title").value("Kubernetes Basics"))
                .andExpect(jsonPath("$.data.excerpt").value("Summary"))
                .andExpect(jsonPath("$.data.availableLocales.length()").value(2))
                .andExpect(jsonPath("$.data.canonicalUrl").value("https://hub.test/en/blog/kubernetes-dasar"));
        // No locale → the first configured one.
        mvc.perform(get("/v1/public/articles/kubernetes-dasar")).andExpect(jsonPath("$.data.locale").value("id"));
        mvc.perform(get("/v1/public/articles?locale=en&category=cloud"))
                .andExpect(jsonPath("$.data[0].title").value("Kubernetes Basics"))
                .andExpect(jsonPath("$.data[0].locale").value("en"));
        mvc.perform(get("/v1/public/sitemap")).andExpect(jsonPath("$.data.articles[?(@.slug == 'kubernetes-dasar')].locales[1]").value(hasItem("en")));
        mvc.perform(get("/v1/admin/articles?q=basics").header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.meta.total").value(1))
                .andExpect(jsonPath("$.data[0].locales.length()").value(2));
        mvc.perform(get("/v1/admin/articles?missingLocale=en").header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.meta.total").value(0));

        // Leaving a language out of the PUT removes it.
        mvc.perform(put("/v1/admin/articles/" + id).header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"slug":"kubernetes-dasar","translations":{"en":%s},"categoryId":"%s","tagIds":["%s"],"version":2}
                                """.formatted(translation("Kubernetes Basics", "Summary"), cat, tag)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.locales.length()").value(1))
                .andExpect(jsonPath("$.data.title").value("Kubernetes Basics"));
        mvc.perform(get("/v1/public/articles/kubernetes-dasar?locale=id"))
                .andExpect(jsonPath("$.data.locale").value("en"));

        mvc.perform(delete("/v1/admin/articles/" + id).header("Authorization", adminBearer())).andExpect(status().isNoContent());
    }

    @Test
    void taxonomyConflictsRenameAndTagDelete() throws Exception {
        String cat = category("Back End");
        mvc.perform(post("/v1/admin/categories").header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"back end\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value("The name is already used"));
        mvc.perform(post("/v1/admin/categories").header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Backend two\",\"slug\":\"back-end\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value("The slug is already used"));
        mvc.perform(patch("/v1/admin/categories/" + cat).header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Backend\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.name").value("Backend"))
                .andExpect(jsonPath("$.data.slug").value("back-end"));
        mvc.perform(patch("/v1/admin/categories/" + cat).header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"x\"}"))
                .andExpect(status().isBadRequest());

        String tag = tag("Java");
        JsonNode article = createArticle("{\"tagIds\":[\"" + tag + "\"],\"translations\":{\"id\":{\"title\":\"Tagged\"}}}");
        mvc.perform(get("/v1/admin/tags").header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.data[0].articleCount").value(1))
                .andExpect(jsonPath("$.data[0].publishedCount").value(0))
                .andExpect(jsonPath("$.meta").doesNotExist());
        mvc.perform(delete("/v1/admin/tags/" + tag).header("Authorization", adminBearer())).andExpect(status().isNoContent());
        mvc.perform(get("/v1/admin/articles/" + article.path("id").stringValue()).header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.data.tags").isEmpty());
    }
}
