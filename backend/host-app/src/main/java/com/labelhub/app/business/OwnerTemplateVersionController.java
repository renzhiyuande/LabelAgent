package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.*;
import com.labelhub.core.business.DimensionPackService;
import com.labelhub.core.business.ReviewPromptAssistService;
import com.labelhub.core.business.TaskService;
import com.labelhub.core.business.TemplatesService;
import com.labelhub.core.lowcode.query.FilterOperator;
import com.labelhub.core.lowcode.query.ParsedFilter;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/owner/template-versions")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerTemplateVersionController {
    private final TemplatesService templatesService;
    private final TaskService taskService;
    private final DimensionPackService dimensionPackService;
    private final ReviewPromptAssistService reviewPromptAssistService;

    public OwnerTemplateVersionController(TemplatesService templatesService, TaskService taskService,
            DimensionPackService dimensionPackService,
            ReviewPromptAssistService reviewPromptAssistService) {
        this.templatesService = templatesService;
        this.taskService = taskService;
        this.dimensionPackService = dimensionPackService;
        this.reviewPromptAssistService = reviewPromptAssistService;
    }

    @GetMapping
    @RequireAnyPermission({ "system:admin", "business:template:read", "business:template:manage",
            "business:task:read" })
    public ApiResponse<PageResponse<TemplateVersionSummary>> listVersions(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) Long templateId,
            @RequestParam(required = false) String keyword) {
        if (templateId == null) {
            return ok(PageResponse.empty());
        }
        return ok(templatesService.listTemplateVersions(templateId,
                new ParsedListQuery(page, pageSize, keyword, List.of(), List.of())));
    }

    @GetMapping("/{id}")
    @RequireAnyPermission({ "system:admin", "business:template:read", "business:template:manage",
            "business:task:read" })
    public ApiResponse<TemplateVersionOwnerDetail> getVersion(@PathVariable Long id) {
        return ok(templatesService.getTemplateVersionDetail(id));
    }

    @PostMapping("/drafts")
    @RequireAnyPermission({ "system:admin", "business:template:create", "business:template:manage",
            "business:task:template_save" })
    public ApiResponse<TemplateVersionSummary> createDraft(
            @Valid @RequestBody TemplateVersionDraftCreateCommand command) {
        return ok(templatesService.createDraftVersion(command.templateId(), command.baseVersionId()));
    }

    @PutMapping("/drafts/{id}")
    @RequireAnyPermission({ "system:admin", "business:template:update", "business:template:manage",
            "business:task:template_save" })
    public ApiResponse<TemplateVersionOwnerDetail> saveDraft(
            @PathVariable Long id,
            @Valid @RequestBody TemplateVersionDraftSaveCommand command) {
        return ok(templatesService.saveVersionDraft(id, command));
    }

    @PostMapping("/{id}/publish")
    @RequireAnyPermission({ "system:admin", "business:template:update", "business:template:manage",
            "business:task:publish" })
    public ApiResponse<TemplateVersionSummary> publishVersion(@PathVariable Long id) {
        return ok(templatesService.publishTemplateVersion(id));
    }

    @PostMapping("/{id}/publish-to-market")
    @RequireAnyPermission({ "system:admin", "business:template:update", "business:template:manage",
            "template:market:publish" })
    public ApiResponse<TemplateVersionSummary> publishToMarket(
            @PathVariable Long id,
            @Valid @RequestBody TemplateVersionPublishToMarketCommand command) {
        return ok(templatesService.submitTemplateVersionToMarket(id, command.description()));
    }

    @PostMapping("/{id}/activate")
    @RequireAnyPermission({ "system:admin", "business:template:update", "business:template:manage",
            "business:task:update" })
    public ApiResponse<Void> activateVersion(@PathVariable Long id) {
        templatesService.activateTemplateVersion(id);
        return ok(null);
    }

    @PostMapping("/{id}/rollback")
    @RequireAnyPermission({ "system:admin", "business:template:update", "business:template:manage",
            "business:task:update" })
    public ApiResponse<Void> rollbackVersion(@PathVariable Long id) {
        templatesService.activateTemplateVersion(id);
        return ok(null);
    }

    @PostMapping("/{id}/archive")
    @RequireAnyPermission({ "system:admin", "business:template:update", "business:template:manage",
            "business:task:update" })
    public ApiResponse<Void> archiveVersion(@PathVariable Long id) {
        taskService.archiveVersion(id, "手动归档");
        return ok(null);
    }

    @GetMapping("/compare")
    @RequireAnyPermission({ "system:admin", "business:template:read", "business:template:manage",
            "business:task:read" })
    public ApiResponse<TemplateVersionDiff> compareVersions(
            @RequestParam Long leftId,
            @RequestParam Long rightId) {
        VersionDiffResult r = taskService.compareVersions(leftId, rightId);
        return ok(new TemplateVersionDiff(r.v1Id(), r.v2Id(), r.addedFields(), r.removedFields(),
                r.modifiedFields()));
    }

    @GetMapping("/review-dimensions")
    @RequireAnyPermission({ "system:admin", "business:template:read", "business:template:manage",
            "business:task:read" })
    public ApiResponse<List<TemplateReviewDimensionSummary>> listReviewDimensions(
            @RequestParam(required = false) Long templateVersionId) {
        if (templateVersionId == null) {
            return ok(List.of());
        }
        return ok(taskService.getTemplateVersionDetail(templateVersionId).reviewDimensions());
    }

    @GetMapping("/{templateVersionId}/review-config")
    @RequireAnyPermission({ "system:admin", "business:template:read", "business:template:manage",
            "business:task:read" })
    public ApiResponse<TemplateReviewConfigDetail> getReviewConfig(@PathVariable Long templateVersionId) {
        TemplateVersionDetailFull detail = taskService.getTemplateVersionDetail(templateVersionId);
        return ok(toReviewConfigDetail(detail));
    }

    @PutMapping("/{templateVersionId}/review-config")
    @RequireAnyPermission({ "system:admin", "business:template:update", "business:template:manage",
            "business:task:template_save" })
    public ApiResponse<TemplateReviewConfigDetail> saveReviewConfig(
            @PathVariable Long templateVersionId,
            @Valid @RequestBody TemplateReviewConfigSaveCommand command) {
        TemplateVersionDetailFull saved = taskService.saveReviewConfig(
                templateVersionId,
                command.reviewPromptTemplate(),
                command.providerPlatformKey(),
                command.modelId(),
                command.reviewWorkflowLevels(),
                command.dimensions() != null ? command.dimensions() : List.of());
        return ok(toReviewConfigDetail(saved));
    }

    @PostMapping("/{templateVersionId}/review-config/assist")
    @RequireAnyPermission({ "system:admin", "business:template:update", "business:template:manage",
            "business:task:template_save" })
    public ApiResponse<TemplateReviewPromptAssistResult> generateReviewPromptSuggestion(
            @PathVariable Long templateVersionId,
            @Valid @RequestBody TemplateReviewPromptAssistCommand command) {
        TemplateReviewPromptAssistCommand actualCommand = new TemplateReviewPromptAssistCommand(
                templateVersionId,
                command.mode(),
                command.providerPlatformKey(),
                command.modelId(),
                command.currentPromptTemplate(),
                command.dimensions());
        return ok(reviewPromptAssistService.generateSuggestion(actualCommand));
    }

    @PutMapping("/review-dimensions/batch")
    @RequireAnyPermission({ "system:admin", "business:template:update", "business:template:manage",
            "business:task:update" })
    public ApiResponse<Void> batchUpdateDimensions(@Valid @RequestBody DimensionBatchUpdateCommand command) {
        TemplateVersionDetailFull detail = taskService.getTemplateVersionDetail(command.templateVersionId());
        taskService.saveReviewConfig(
                command.templateVersionId(),
                detail.reviewPromptTemplate(),
                null,
                null,
                null,
                command.dimensions());
        return ok(null);
    }

    @GetMapping("/dimension-pack-options")
    @RequireAnyPermission({ "system:admin", "business:template:read", "business:template:manage",
            "business:task:read" })
    public ApiResponse<List<DimensionPackOptionSummary>> listDimensionPackOptions() {
        PageResponse<TemplateReviewDimensionPackSummary> page = dimensionPackService.listPacks(
                new ParsedListQuery(1, 200, null,
                        List.of(new ParsedFilter("status", FilterOperator.EQ, "ACTIVE")), List.of()));
        return ok(page.list().stream()
                .map(item -> new DimensionPackOptionSummary(item.id(), item.packCode(), item.packName(),
                        item.packDesc()))
                .toList());
    }

    @PostMapping("/{id}/apply-dimension-pack")
    @RequireAnyPermission({ "system:admin", "business:template:update", "business:template:manage",
            "business:task:template_save" })
    public ApiResponse<List<TemplateReviewDimensionSummary>> applyDimensionPack(
            @PathVariable Long id,
            @Valid @RequestBody ApplyDimensionPackCommand command) {
        dimensionPackService.applyPackToTemplateVersion(command.packId(), id);
        return ok(taskService.getTemplateVersionDetail(id).reviewDimensions());
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }

    public record TemplateVersionPublishToMarketCommand(String description) {
    }

    private TemplateReviewConfigDetail toReviewConfigDetail(TemplateVersionDetailFull detail) {
        return new TemplateReviewConfigDetail(
                detail.id(),
                detail.versionNo(),
                detail.status(),
                detail.reviewPromptTemplate(),
                detail.providerPlatformKey(),
                detail.modelId(),
                detail.reviewWorkflowLevels(),
                detail.reviewDimensions());
    }
}
