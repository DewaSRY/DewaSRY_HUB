package com.sdewa.coreservices.content;

import com.sdewa.coreservices.media.Image;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

/**
 * An article. The body is Tiptap/ProseMirror JSON (ADR-009 §4); {@code bodyText} and
 * {@code wordCount} are derived on save. {@code version} is the optimistic lock (409 VERSION_CONFLICT).
 */
@Entity
@Table(name = "articles")
@Getter
@Setter
@NoArgsConstructor
public class Article {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @Column(nullable = false, length = 120)
    private String slug;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cover_image_id")
    private Image coverImage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "meta_title", length = 200)
    private String metaTitle;

    @Column(name = "meta_description", length = 320)
    private String metaDescription;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ArticleStatus status = ArticleStatus.DRAFT;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Version
    @Column(nullable = false)
    private int version;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "article_tags", joinColumns = @JoinColumn(name = "article_id"), inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new LinkedHashSet<>();

    /** Rebuilt from the {@code image} nodes of the body on every save (ADR-009 §4.3). */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "article_body_images", joinColumns = @JoinColumn(name = "article_id"), inverseJoinColumns = @JoinColumn(name = "image_id"))
    private Set<Image> bodyImages = new LinkedHashSet<>();

    public boolean isPublished() {
        return status == ArticleStatus.PUBLISHED;
    }

    /** {@code ceil(word_count / 200)} minutes (ADR-009 §4.4). */
    public int readingMinutes() {
        return (wordCount + 199) / 200;
    }
}
