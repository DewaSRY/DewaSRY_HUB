package com.sdewa.coreservices.media;

import com.sdewa.coreservices.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** UC-19 with the real Scrimage + cwebp pipeline and local storage. */
class MediaFlowTest extends IntegrationTest {

    @Autowired
    ImageStorage storage;

    static byte[] image(int w, int h, String format, Color color) throws Exception {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(color);
        g.fillRect(0, 0, w, h);
        g.setColor(Color.WHITE);
        g.fillOval(w / 4, h / 4, w / 2, h / 2);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, format, out);
        return out.toByteArray();
    }

    private MvcResult upload(byte[] bytes, String name, String alt) throws Exception {
        var req = multipart("/v1/admin/media").file(new MockMultipartFile("file", name, "application/octet-stream", bytes))
                .header("Authorization", adminBearer());
        if (alt != null) {
            req.param("alt", alt);
        }
        return mvc.perform(req).andReturn();
    }

    @Test
    void uploadResizesToWebpDedupesAndProtectsUsedImages() throws Exception {
        byte[] png = image(2000, 1000, "png", Color.BLUE);
        MvcResult first = upload(png, "diagram.png", "Architecture diagram");
        assertThat(first.getResponse().getStatus()).isEqualTo(201);
        JsonNode img = body(first).path("data");
        String hash = img.path("contentHash").stringValue();
        assertThat(img.path("width").intValue()).isEqualTo(1600);
        assertThat(img.path("height").intValue()).isEqualTo(800);
        assertThat(img.path("variants")).hasSize(3);
        assertThat(img.path("variants").get(0).path("width").intValue()).isEqualTo(480);
        assertThat(img.path("variants").get(0).path("url").stringValue()).isEqualTo("https://cdn.hub.test/images/" + hash + "/480.webp");
        assertThat(img.path("fileName").stringValue()).isEqualTo("diagram.png");
        assertThat(img.path("usedBy")).isEmpty();
        LocalImageStorage local = (LocalImageStorage) storage;
        assertThat(local.exists("images/" + hash + "/960.webp")).isTrue();

        // Same bytes again → 200 with the same record (content-hash dedupe).
        MvcResult again = upload(png, "copy.png", "Other alt");
        assertThat(again.getResponse().getStatus()).isEqualTo(200);
        assertThat(body(again).path("data").path("id").stringValue()).isEqualTo(img.path("id").stringValue());

        String id = img.path("id").stringValue();
        mvc.perform(patch("/v1/admin/media/" + id).header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"alt\":\"New alt\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.alt").value("New alt"));

        // Used as a cover and in the body → cannot delete.
        mvc.perform(post("/v1/admin/articles").header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"coverImageId":"%s","translations":{"id":{"title":"With image","body":{"type":"doc","content":[
                                  {"type":"image","attrs":{"imageId":"%s","width":"wide"}}]}}}}""".formatted(id, id)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.images['" + id + "'].variants.length()").value(3))
                .andExpect(jsonPath("$.data.coverImage.id").value(id));
        mvc.perform(get("/v1/admin/media/" + id).header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.data.usedBy.length()").value(2));
        mvc.perform(get("/v1/admin/media?unused=true").header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.meta.total").value(0));
        mvc.perform(delete("/v1/admin/media/" + id).header("Authorization", adminBearer()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error[0].field").value("articles"))
                .andExpect(jsonPath("$.error[0].message").value("With image"));

        // An unused, small JPEG: one variant at its own width (never upscaled), deletable.
        MvcResult small = upload(image(300, 200, "jpg", Color.RED), "small.jpg", "Small");
        assertThat(small.getResponse().getStatus()).isEqualTo(201);
        JsonNode s = body(small).path("data");
        assertThat(s.path("variants")).hasSize(1);
        assertThat(s.path("variants").get(0).path("width").intValue()).isEqualTo(300);
        mvc.perform(get("/v1/admin/media?unused=true&q=small").header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.meta.total").value(1));
        mvc.perform(delete("/v1/admin/media/" + s.path("id").stringValue()).header("Authorization", adminBearer()))
                .andExpect(status().isNoContent());
        assertThat(local.exists("images/" + s.path("contentHash").stringValue() + "/300.webp")).isFalse();
    }

    @Test
    void rejectsWrongTypeMissingAltAndGarbage() throws Exception {
        assertThat(upload("hello".getBytes(), "x.txt", "alt").getResponse().getStatus()).isEqualTo(415);
        MvcResult noAlt = upload(image(100, 100, "png", Color.GREEN), "a.png", null);
        assertThat(noAlt.getResponse().getStatus()).isEqualTo(400);
        assertThat(body(noAlt).path("error").get(0).path("field").stringValue()).isEqualTo("alt");
        byte[] fakePng = new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4};
        MvcResult garbage = upload(fakePng, "broken.png", "alt");
        assertThat(garbage.getResponse().getStatus()).isEqualTo(400);
        assertThat(body(garbage).path("message").stringValue()).isEqualTo("The image could not be read");
    }
}
