package com.sdewa.coreservices.content;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "categories")
public class Category extends TaxonomyTerm {
}
