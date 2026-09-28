package com.sdewa.coreservices.content;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ArticleSlugHistoryRepository extends JpaRepository<ArticleSlugHistory, String> {

    List<ArticleSlugHistory> findAllByArticleIdOrderByCreatedAtAsc(UUID articleId);

    @Query("select count(h) > 0 from ArticleSlugHistory h where h.oldSlug = :slug and (:excludeArticleId is null or h.articleId <> :excludeArticleId)")
    boolean slugTaken(@Param("slug") String slug, @Param("excludeArticleId") UUID excludeArticleId);
}
