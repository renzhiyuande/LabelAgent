package com.labelhub.infra.business.review.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.labelhub.infra.persistence.entity.AiReviewDimensionScoreEntity;
import com.labelhub.infra.persistence.entity.AiReviewRecordEntity;
import com.labelhub.infra.persistence.entity.ReviewRecordEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.AiReviewDimensionScoreMapper;
import com.labelhub.infra.persistence.mapper.AiReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.ReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class AiReviewMemoryRetrieverTest {

    @BeforeAll
    static void initMybatisPlusEntityMetadata() {
        MybatisConfiguration configuration = new MybatisConfiguration();
        MapperBuilderAssistant assistant =
                new MapperBuilderAssistant(configuration, AiReviewMemoryRetrieverTest.class.getName());
        TableInfoHelper.initTableInfo(assistant, TemplateVersionEntity.class);
        TableInfoHelper.initTableInfo(assistant, SubmissionEntity.class);
    }

    @Test
    void loadRecentCases_returnsEmptyWhenTemplateVersionMissing() {
        AiReviewMemoryRetriever retriever = new AiReviewMemoryRetriever(
                mock(SubmissionMapper.class),
                mock(ReviewRecordMapper.class),
                mock(AiReviewRecordMapper.class),
                mock(AiReviewDimensionScoreMapper.class),
                mock(TemplateVersionMapper.class));

        assertEquals(List.of(), retriever.loadRecentCases(null, 1001L));
    }

    @Test
    void loadRecentCases_returnsSummarizedHumanReviewedCase() {
        SubmissionMapper submissionMapper = mock(SubmissionMapper.class);
        ReviewRecordMapper reviewRecordMapper = mock(ReviewRecordMapper.class);
        AiReviewRecordMapper aiReviewRecordMapper = mock(AiReviewRecordMapper.class);
        AiReviewDimensionScoreMapper aiReviewDimensionScoreMapper = mock(AiReviewDimensionScoreMapper.class);

        SubmissionEntity submission = new SubmissionEntity();
        submission.setId(101L);
        submission.setDeletedFlag(0);
        submission.setLastAiReviewId(501L);
        submission.setLastReviewRecordId(601L);
        submission.setUpdatedAt(Instant.now());

        ReviewRecordEntity reviewRecord = new ReviewRecordEntity();
        reviewRecord.setId(601L);
        reviewRecord.setDeletedFlag(0);
        reviewRecord.setAction("approve");
        reviewRecord.setCommentText("人工确认该样本判断准确。");

        AiReviewRecordEntity aiReviewRecord = new AiReviewRecordEntity();
        aiReviewRecord.setId(501L);
        aiReviewRecord.setDeletedFlag(0);
        aiReviewRecord.setVerdict("PASS");
        aiReviewRecord.setTotalScore(BigDecimal.valueOf(88));

        AiReviewDimensionScoreEntity dimensionScore = new AiReviewDimensionScoreEntity();
        dimensionScore.setAiReviewId(501L);
        dimensionScore.setDimensionKey("ACCURACY");
        dimensionScore.setDimensionName("准确性");
        dimensionScore.setScore(BigDecimal.valueOf(90));
        dimensionScore.setCommentText("AI 认为判断准确。");
        dimensionScore.setSortNo(1);

        when(submissionMapper.selectList(any())).thenReturn(List.of(submission));
        when(reviewRecordMapper.selectById(601L)).thenReturn(reviewRecord);
        when(aiReviewRecordMapper.selectById(501L)).thenReturn(aiReviewRecord);
        when(aiReviewDimensionScoreMapper.selectList(any())).thenReturn(List.of(dimensionScore));

        AiReviewMemoryRetriever retriever = new AiReviewMemoryRetriever(
                submissionMapper,
                reviewRecordMapper,
                aiReviewRecordMapper,
                aiReviewDimensionScoreMapper,
                mock(TemplateVersionMapper.class));

        List<Map<String, Object>> memories = retriever.loadRecentCases(10L, 999L);

        assertEquals(1, memories.size());
        assertEquals("submission:101", memories.get(0).get("caseId"));
        assertEquals("approve", memories.get(0).get("humanDecision"));
        assertTrue(((List<?>) memories.get(0).get("dimensionScores")).size() == 1);
    }

    @Test
    void loadRecentCasesForPromptOptimization_usesPublishedLineageVersions() {
        SubmissionMapper submissionMapper = mock(SubmissionMapper.class);
        ReviewRecordMapper reviewRecordMapper = mock(ReviewRecordMapper.class);
        AiReviewRecordMapper aiReviewRecordMapper = mock(AiReviewRecordMapper.class);
        AiReviewDimensionScoreMapper aiReviewDimensionScoreMapper = mock(AiReviewDimensionScoreMapper.class);
        TemplateVersionMapper templateVersionMapper = mock(TemplateVersionMapper.class);

        TemplateVersionEntity draftVersion = new TemplateVersionEntity();
        draftVersion.setId(20L);
        draftVersion.setDeletedFlag(0);
        draftVersion.setTemplateId(300L);
        draftVersion.setTaskId(400L);
        draftVersion.setStatus("DRAFT");

        TemplateVersionEntity publishedVersion = new TemplateVersionEntity();
        publishedVersion.setId(10L);
        publishedVersion.setDeletedFlag(0);
        publishedVersion.setStatus("PUBLISHED");

        SubmissionEntity submission = new SubmissionEntity();
        submission.setId(101L);
        submission.setDeletedFlag(0);
        submission.setCurrentTemplateVersionId(10L);
        submission.setLastAiReviewId(501L);
        submission.setLastReviewRecordId(601L);
        submission.setUpdatedAt(Instant.now());

        ReviewRecordEntity reviewRecord = new ReviewRecordEntity();
        reviewRecord.setId(601L);
        reviewRecord.setDeletedFlag(0);
        reviewRecord.setAction("approve");
        reviewRecord.setCommentText("历史版本样本。");

        AiReviewRecordEntity aiReviewRecord = new AiReviewRecordEntity();
        aiReviewRecord.setId(501L);
        aiReviewRecord.setDeletedFlag(0);
        aiReviewRecord.setVerdict("PASS");
        aiReviewRecord.setTotalScore(BigDecimal.valueOf(88));

        when(templateVersionMapper.selectById(20L)).thenReturn(draftVersion);
        when(templateVersionMapper.selectList(any())).thenReturn(List.of(publishedVersion));
        when(submissionMapper.selectList(any())).thenReturn(List.of(submission));
        when(reviewRecordMapper.selectById(601L)).thenReturn(reviewRecord);
        when(aiReviewRecordMapper.selectById(501L)).thenReturn(aiReviewRecord);
        when(aiReviewDimensionScoreMapper.selectList(any())).thenReturn(List.of());

        AiReviewMemoryRetriever retriever = new AiReviewMemoryRetriever(
                submissionMapper,
                reviewRecordMapper,
                aiReviewRecordMapper,
                aiReviewDimensionScoreMapper,
                templateVersionMapper);

        List<Map<String, Object>> memories = retriever.loadRecentCasesForPromptOptimization(20L);

        assertEquals(1, memories.size());
        assertEquals("历史版本样本。", memories.get(0).get("humanComment"));
    }
}
