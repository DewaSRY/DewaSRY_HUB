package com.sdewa.coreservices.content;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * The content of an article in one language: title, excerpt, body (Tiptap/ProseMirror JSON,
 * ADR-009 §4) and SEO fields. {@code bodyText} and {@code wordCount} are derived on save.
 */
@Entity
@Table(name = "article_translations")
@Getter
@Setter
@NoArgsConstructor
public class ArticleTranslation {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "article_id", nullable = false, updatable = false)
    private Article article;

    @Column(nullable = false, length = 10, updatable = false)
    private String locale;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 500)
    private String excerpt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String body = "{\"type\":\"doc\",\"content\":[]}";

    @Column(name = "body_schema_version", nullable = false)
    private short bodySchemaVersion = 1;

    @Column(name = "body_text", nullable = false, columnDefinition = "text")
    private String bodyText = "";

    @Column(name = "word_count", nullable = false)
    private int wordCount;

    @Column(name = "meta_title", length = 200)
    private String metaTitle;

    @Column(name = "meta_description", length = 320)
    private String metaDescription;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public ArticleTranslation(Article article, String locale) {
        this.article = article;
        this.locale = locale;
    }

    /** {@code ceil(word_count / 200)} minutes (ADR-009 §4.4). */
    public int readingMinutes() {
        return (wordCount + 199) / 200;
    }
}
