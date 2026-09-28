package com.sdewa.coreservices.content;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/** Old slugs of published articles; they answer 301 to the new slug (UC-16). */
@Entity
@Table(name = "article_slug_history")
@Getter
@Setter
@NoArgsConstructor
public class ArticleSlugHistory {

    @Id
    @Column(name = "old_slug", length = 120)
    private String oldSlug;

    @Column(name = "article_id", nullable = false)
    private UUID articleId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public ArticleSlugHistory(String oldSlug, UUID articleId) {
        this.oldSlug = oldSlug;
        this.articleId = articleId;
    }
}
