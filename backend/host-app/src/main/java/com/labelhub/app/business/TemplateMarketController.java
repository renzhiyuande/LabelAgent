package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.*;
import com.labelhub.core.business.TemplateMarketService;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import com.labelhub.infra.persistence.entity.TemplateMarketEntity;
import com.labelhub.infra.persistence.mapper.TemplateMarketMapper;
import com.labelhub.infra.system.UserDisplayNameResolver;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/template-market")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class TemplateMarketController {
    private final TemplateMarketService templateMarketService;
    private final TemplateMarketMapper templateMarketMapper;
    private final UserDisplayNameResolver userDisplayNameResolver;

    public TemplateMarketController(
            TemplateMarketService templateMarketService,
            TemplateMarketMapper templateMarketMapper,
            UserDisplayNameResolver userDisplayNameResolver) {
        this.templateMarketService = templateMarketService;
        this.templateMarketMapper = templateMarketMapper;
        this.userDisplayNameResolver = userDisplayNameResolver;
    }

    @GetMapping
    public ApiResponse<PageResponse<TemplateMarketItemSummary>> listMarketItems(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword) {
        PageResponse<TemplateMarketSummary> result = templateMarketService
                .listMarketTemplates(new ParsedListQuery(page, pageSize, keyword, List.of(), List.of()));
        return ok(PageResponse.of(result.total(), result.page(), result.pageSize(),
                result.list().stream().map(this::toItemSummary).toList()));
    }

    @GetMapping("/admin")
    @RequireAnyPermission({ "template:market:audit" })
    public ApiResponse<PageResponse<TemplateMarketItemSummary>> listMarketItemsForAdmin(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword) {
        PageResponse<TemplateMarketSummary> result = templateMarketService
                .listMarketTemplatesForAdmin(new ParsedListQuery(page, pageSize, keyword, List.of(), List.of()));
        return ok(PageResponse.of(result.total(), result.page(), result.pageSize(),
                result.list().stream().map(this::toItemSummary).toList()));
    }

    @GetMapping("/admin/{id}")
    @RequireAnyPermission({ "template:market:audit" })
    public ApiResponse<TemplateMarketItemDetail> getMarketItemForAdmin(@PathVariable Long id) {
        TemplateMarketSummary s = templateMarketService.getMarketDetailForAdmin(id);
        return ok(toItemDetail(s));
    }

    @GetMapping("/{id}")
    public ApiResponse<TemplateMarketItemDetail> getMarketItem(@PathVariable Long id) {
        TemplateMarketSummary s = templateMarketService.getMarketDetail(id);
        return ok(toItemDetail(s));
    }

    @PostMapping("/publish")
    @RequireAnyPermission({ "template:market:publish" })
    public ApiResponse<TemplateMarketItemSummary> publishToMarket(
            @Valid @RequestBody TemplateMarketPublishCommand command) {
        return ok(toItemSummary(
                templateMarketService.submitForReview(command.templateVersionId(), command.description())));
    }

    @PostMapping("/audit/{id}")
    @RequireAnyPermission({ "template:market:audit" })
    public ApiResponse<Void> auditItem(@PathVariable Long id, @Valid @RequestBody TemplateMarketAuditCommand command) {
        String result = command.auditResult();
        if ("APPROVED".equalsIgnoreCase(result) || "APPROVE".equalsIgnoreCase(result) || "PASS".equalsIgnoreCase(result)) {
            templateMarketService.approve(id, command.reviewComment());
        } else {
            templateMarketService.reject(id, command.reviewComment());
        }
        return ok(null);
    }

    @PostMapping("/{id}/install")
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public ApiResponse<TemplateMarketInstallResult> installFromMarket(@PathVariable Long id) {
        return ok(templateMarketService.installFromMarket(id));
    }

    private TemplateMarketItemSummary toItemSummary(TemplateMarketSummary s) {
        return new TemplateMarketItemSummary(s.id(), s.templateCode(), s.templateName(), s.templateDesc(),
                s.sceneCode(), s.downloadCount(), s.favoriteCount(), s.ratingAvg(), s.isFeatured(), s.auditStatus(), s.marketStatus(),
                s.publishedAt(), s.installed(), s.installedTemplateId(), s.installedTemplateVersionId());
    }

    private TemplateMarketItemDetail toItemDetail(TemplateMarketSummary s) {
        TemplateMarketEntity entity = templateMarketMapper.selectById(s.id());
        String publisherName = entity != null ? userDisplayNameResolver.resolve(entity.getAuthorId(), "-") : "-";
        String versionInfo = entity != null && entity.getTemplateVersionId() != null
                ? "版本ID " + entity.getTemplateVersionId()
                : "-";
        Integer isFeatured = entity != null ? entity.getIsFeatured() : 0;
        Long sourceTaskId = entity != null ? entity.getSourceTaskId() : null;
        Long sourceTemplateVersionId = entity != null ? entity.getTemplateVersionId() : null;
        Map<String, Object> schemaJson = Map.of();
        return new TemplateMarketItemDetail(
                s.id(),
                s.templateCode(),
                s.templateName(),
                s.templateDesc(),
                s.sceneCode(),
                publisherName,
                versionInfo,
                isFeatured,
                s.auditStatus(),
                s.marketStatus(),
                sourceTaskId,
                sourceTemplateVersionId,
                schemaJson,
                s.downloadCount(),
                s.favoriteCount(),
                s.ratingAvg(),
                0,
                s.publishedAt(),
                s.publishedAt(),
                s.installed(),
                s.installedTemplateId(),
                s.installedTemplateVersionId());
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
