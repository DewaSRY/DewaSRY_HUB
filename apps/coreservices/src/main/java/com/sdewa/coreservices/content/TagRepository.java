package com.sdewa.coreservices.content;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TagRepository extends JpaRepository<Tag, UUID> {

    Optional<Tag> findBySlug(String slug);

    @Query("select count(t) > 0 from Tag t where lower(t.name) = lower(:name) and (:excludeId is null or t.id <> :excludeId)")
    boolean nameTaken(@Param("name") String name, @Param("excludeId") UUID excludeId);

    @Query("select count(t) > 0 from Tag t where t.slug = :slug and (:excludeId is null or t.id <> :excludeId)")
    boolean slugTaken(@Param("slug") String slug, @Param("excludeId") UUID excludeId);

    List<Tag> findAllByOrderByNameAsc();
}
