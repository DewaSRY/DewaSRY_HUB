package com.sdewa.coreservices.content;

import com.sdewa.coreservices.media.Image;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.MapKey;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Formula;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * An article: what every language shares (slug, cover, category, tags, status). The text lives in
 * {@link ArticleTranslation}s, one per locale. {@code version} is the optimistic lock
 * (409 VERSION_CONFLICT) and is bumped on every save, translations included.
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cover_image_id")
    private Image coverImage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

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

    /** One per language, keyed by locale (see {@link ContentLocales}). */
    @OneToMany(mappedBy = "article", cascade = CascadeType.ALL, orphanRemoval = true)
    @MapKey(name = "locale")
    @BatchSize(size = 50)
    private Map<String, ArticleTranslation> translations = new LinkedHashMap<>();

    /** Sort key of the admin list: the title of the first translation written. */
    @Formula("(select t.title from article_translations t where t.article_id = id order by t.created_at, t.locale limit 1)")
    private String sortTitle;

    /** Rebuilt from the {@code image} nodes of every translation's body on save (ADR-009 §4.3). */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "article_body_images", joinColumns = @JoinColumn(name = "article_id"), inverseJoinColumns = @JoinColumn(name = "image_id"))
    private Set<Image> bodyImages = new LinkedHashSet<>();

    public boolean isPublished() {
        return status == ArticleStatus.PUBLISHED;
    }

    /** Adds or returns the translation for {@code locale}. */
    public ArticleTranslation translation(String locale) {
        return translations.computeIfAbsent(locale, l -> new ArticleTranslation(this, l));
    }
}
