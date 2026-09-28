package com.sdewa.coreservices.content;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ArticleRepository extends JpaRepository<Article, UUID>, JpaSpecificationExecutor<Article> {

    @EntityGraph(attributePaths = {"category", "coverImage"})
    Optional<Article> findBySlugAndStatus(String slug, ArticleStatus status);

    @Query("select count(a) > 0 from Article a where a.slug = :slug and (:excludeId is null or a.id <> :excludeId)")
    boolean slugTaken(@Param("slug") String slug, @Param("excludeId") UUID excludeId);

    long countByCategoryId(UUID categoryId);

    @Query("select a from Article a where a.category.id = :categoryId and a.status = com.sdewa.coreservices.content.ArticleStatus.PUBLISHED")
    List<Article> findPublishedByCategory(@Param("categoryId") UUID categoryId);

    @Query("select a from Article a join a.tags t where t.id = :tagId and a.status = com.sdewa.coreservices.content.ArticleStatus.PUBLISHED")
    List<Article> findPublishedByTag(@Param("tagId") UUID tagId);

    /** [categoryId, total, published] */
    @Query("select a.category.id, count(a), sum(case when a.status = com.sdewa.coreservices.content.ArticleStatus.PUBLISHED then 1 else 0 end) "
            + "from Article a where a.category is not null group by a.category.id")
    List<Object[]> countsByCategory();

    /** [tagId, total, published] */
    @Query("select t.id, count(a), sum(case when a.status = com.sdewa.coreservices.content.ArticleStatus.PUBLISHED then 1 else 0 end) "
            + "from Article a join a.tags t group by t.id")
    List<Object[]> countsByTag();

    /** [slug, name, publishedCount] for categories with at least one published article. */
    @Query("select c.slug, c.name, count(a) from Article a join a.category c "
            + "where a.status = com.sdewa.coreservices.content.ArticleStatus.PUBLISHED group by c.slug, c.name order by c.name")
    List<Object[]> publicCategories();

    @Query("select t.slug, t.name, count(a) from Article a join a.tags t "
            + "where a.status = com.sdewa.coreservices.content.ArticleStatus.PUBLISHED group by t.slug, t.name order by t.name")
    List<Object[]> publicTags();

    @Query("select count(a) from Article a where a.category.slug = :slug and a.status = com.sdewa.coreservices.content.ArticleStatus.PUBLISHED")
    long countPublishedInCategory(@Param("slug") String slug);

    @Query("select count(a) from Article a join a.tags t where t.slug = :slug and a.status = com.sdewa.coreservices.content.ArticleStatus.PUBLISHED")
    long countPublishedWithTag(@Param("slug") String slug);

    @Query("select a.slug, a.updatedAt from Article a where a.status = com.sdewa.coreservices.content.ArticleStatus.PUBLISHED order by a.publishedAt desc")
    List<Object[]> sitemapArticles();

    @Query("select distinct c.slug, c.updatedAt from Article a join a.category c where a.status = com.sdewa.coreservices.content.ArticleStatus.PUBLISHED")
    List<Object[]> sitemapCategories();

    @Query("select distinct t.slug, t.updatedAt from Article a join a.tags t where a.status = com.sdewa.coreservices.content.ArticleStatus.PUBLISHED")
    List<Object[]> sitemapTags();
}
