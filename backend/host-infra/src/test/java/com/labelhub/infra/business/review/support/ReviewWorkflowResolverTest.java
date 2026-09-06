package com.labelhub.infra.business.review.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ReviewWorkflowResolverTest {

    private ReviewWorkflowResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new ReviewWorkflowResolver(new ObjectMapper());
    }

    @Test
    void defaultsToSingleL1WhenMissing() {
        assertThat(resolver.parseLevels(null)).containsExactly("L1");
        assertThat(resolver.parseLevels("")).containsExactly("L1");
        assertThat(resolver.parseLevels("{}")).containsExactly("L1");
    }

    @Test
    void parsesStringLevelArray() {
        String json = """
                {"levels":["L1","L2","L3"]}
                """;
        assertThat(resolver.parseLevels(json)).containsExactly("L1", "L2", "L3");
        assertThat(resolver.labelFor(json, "L2")).isEqualTo("复审");
        assertThat(resolver.isFinalLevel(json, "L3")).isTrue();
        assertThat(resolver.isFinalLevel(json, "L2")).isFalse();
        assertThat(resolver.nextLevel(json, "L1")).isEqualTo("L2");
        assertThat(resolver.stageNo(json, "L3")).isEqualTo(3);
    }

    @Test
    void parsesObjectLevelArray() {
        String json = """
                {
                  "levels": [
                    {"key":"L1","label":"初审","actions":["approve","reject","return"]},
                    {"key":"L2","label":"复审","actions":["approve","reject","return"]},
                    {"key":"L3","label":"终审","actions":["approve","reject","return"]}
                  ]
                }
                """;
        assertThat(resolver.parseDefinition(json)).hasSize(3);
        assertThat(resolver.parseLevels(json)).containsExactly("L1", "L2", "L3");
        assertThat(resolver.firstLevel(json)).isEqualTo("L1");
        assertThat(resolver.nextLevel(json, "L2")).isEqualTo("L3");
        assertThat(resolver.allowsAction(json, "L1", "approve")).isTrue();
        assertThat(resolver.allowsAction(json, "L1", "APPROVE")).isTrue();
        assertThat(resolver.allowsAction(json, "L1", "unknown")).isFalse();
    }

    @Test
    void fallsBackWhenJsonInvalid() {
        assertThat(resolver.parseLevels("{not-json")).containsExactly("L1");
    }

    @Test
    void fallsBackWhenLevelsEmpty() {
        assertThat(resolver.parseLevels("{\"levels\":[]}")).containsExactly("L1");
    }
}
