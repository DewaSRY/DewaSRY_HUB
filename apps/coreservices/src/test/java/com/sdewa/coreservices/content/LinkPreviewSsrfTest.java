package com.sdewa.coreservices.content;

import com.sdewa.coreservices.content.linkpreview.AddressPolicy;
import com.sdewa.coreservices.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.net.InetAddress;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** ADR-009 §5.5 SSRF guards (no outbound network needed: every case is rejected before connecting). */
class LinkPreviewSsrfTest extends IntegrationTest {

    @Test
    void addressPolicyRejectsNonPublicAddresses() throws Exception {
        for (String ip : new String[]{"127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1",
                "0.0.0.0", "224.0.0.1", "255.255.255.255", "::1", "fe80::1", "fc00::1", "fd12:3456::1", "::ffff:127.0.0.1",
                "64:ff9b::a9fe:a9fe", "2001:db8::1", "198.18.0.1", "192.0.2.1"}) {
            assertThat(AddressPolicy.isPublic(InetAddress.getByName(ip))).as(ip).isFalse();
        }
        for (String ip : new String[]{"93.184.216.34", "8.8.8.8", "2606:4700:4700::1111"}) {
            assertThat(AddressPolicy.isPublic(InetAddress.getByName(ip))).as(ip).isTrue();
        }
    }

    @Test
    void endpointRejectsPlainHttpPrivateTargetsAndCredentials() throws Exception {
        for (String url : new String[]{"http://example.com/", "https://127.0.0.1/", "https://localhost/", "https://10.0.0.5/admin",
                "https://[::1]/", "https://169.254.169.254/latest/meta-data/", "https://user:pass@example.com/",
                "https://example.com:8443/", "ftp://example.com/", "file:///etc/passwd"}) {
            mvc.perform(post("/v1/admin/link-preview").header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                            .content("{\"url\":\"" + url + "\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value(400));
        }
    }

    @Test
    void endpointIsAdminOnly() throws Exception {
        mvc.perform(post("/v1/admin/link-preview").header("Authorization", bearer("not-admin")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"url\":\"https://example.com\"}")).andExpect(status().isForbidden());
        mvc.perform(post("/v1/admin/link-preview").header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.error[0].field").value("url"));
    }
}
