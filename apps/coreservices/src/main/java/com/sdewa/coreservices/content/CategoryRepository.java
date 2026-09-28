package com.sdewa.coreservices.content;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

    Optional<Category> findBySlug(String slug);

    boolean existsBySlug(String slug);

    @Query("select count(c) > 0 from Category c where lower(c.name) = lower(:name) and (:excludeId is null or c.id <> :excludeId)")
    boolean nameTaken(@Param("name") String name, @Param("excludeId") UUID excludeId);

    @Query("select count(c) > 0 from Category c where c.slug = :slug and (:excludeId is null or c.id <> :excludeId)")
    boolean slugTaken(@Param("slug") String slug, @Param("excludeId") UUID excludeId);

    List<Category> findAllByOrderByNameAsc();
}
