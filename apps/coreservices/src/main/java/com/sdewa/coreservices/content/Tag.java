package com.sdewa.coreservices.content;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "tags")
public class Tag extends TaxonomyTerm {
}
