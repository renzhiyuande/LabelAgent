package com.labelhub.core.lowcode.form;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;

/**
 * 标注提交富文本 HTML 服务端清洗，白名单与前端 {@code sanitizeShowItemHtml} / DOMPurify 对齐。
 */
public final class FormSchemaHtmlSanitizer {

    private static final PolicyFactory POLICY = new HtmlPolicyBuilder()
            .allowElements(
                    "a",
                    "br",
                    "code",
                    "div",
                    "em",
                    "figure",
                    "h1",
                    "h2",
                    "h3",
                    "img",
                    "li",
                    "ol",
                    "p",
                    "strong",
                    "table",
                    "tbody",
                    "td",
                    "th",
                    "thead",
                    "tr",
                    "ul",
                    "video")
            .allowAttributes("href", "title")
            .onElements("a")
            .allowAttributes("src", "alt", "class", "style", "title", "data-lh-file-id")
            .onElements("img")
            .allowAttributes("src", "class", "style", "title", "controls", "playsinline", "preload", "data-lh-file-id")
            .onElements("video")
            .allowAttributes("class", "style")
            .globally()
            .allowStandardUrlProtocols()
            .toFactory();

    private static final Pattern IMG_FILE_SRC = Pattern.compile(
            "<img\\b([^>]*)\\bsrc\\s*=\\s*[\"'](/api/v1/files/(\\d+)/download)[\"']([^>]*)>",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern VIDEO_FILE_SRC = Pattern.compile(
            "<video\\b([^>]*)\\bsrc\\s*=\\s*[\"'](/api/v1/files/(\\d+)/download)[\"']([^>]*)>",
            Pattern.CASE_INSENSITIVE);

    private FormSchemaHtmlSanitizer() {
    }

    public static void sanitizeAnnotatePayload(Map<String, Object> schemaRoot, Map<String, Object> payload) {
        if (schemaRoot == null || schemaRoot.isEmpty() || payload == null || payload.isEmpty()) {
            return;
        }
        for (Map<String, Object> field : FormSchemaAnnotateFieldSupport.collectAnnotateFields(schemaRoot)) {
            sanitizeFieldTree(field, null, payload, FormSchemaValidationOptions.forAssignment());
        }
    }

    public static String sanitizeHtml(String html) {
        if (html == null || html.isBlank()) {
            return html;
        }
        return POLICY.sanitize(rewriteAuthenticatedFileMediaUrls(html));
    }

    @SuppressWarnings("unchecked")
    private static void sanitizeFieldTree(
            Map<String, Object> field,
            String parentPath,
            Map<String, Object> rootValues,
            FormSchemaValidationOptions options) {
        String path = parentPath == null
                ? FormSchemaAnnotateFieldSupport.resolveBinding(field)
                : parentPath;
        if (path == null) {
            return;
        }
        Map<String, Object> contextValues = parentPath == null
                ? rootValues
                : FormSchemaJsonPaths.objectAtPath(rootValues, parentPath);

        if ("array".equalsIgnoreCase(String.valueOf(field.get("component")))) {
            sanitizeArrayField(field, path, rootValues, options);
            return;
        }

        if (!FormSchemaAnnotateFieldSupport.shouldValidateField(field, options, contextValues)) {
            return;
        }
        if (isHtmlField(field)) {
            sanitizeValueAtPath(rootValues, path);
        }
    }

    @SuppressWarnings("unchecked")
    private static void sanitizeArrayField(
            Map<String, Object> field,
            String path,
            Map<String, Object> rootValues,
            FormSchemaValidationOptions options) {
        if (!FormSchemaAnnotateFieldSupport.shouldValidateField(field, options, rootValues)) {
            return;
        }
        Object raw = FormSchemaJsonPaths.readValue(rootValues, path);
        List<?> items = raw instanceof List<?> list ? list : List.of();
        Object nested = field.get("fields");
        if (!(nested instanceof List<?> childFields)) {
            return;
        }
        for (int index = 0; index < items.size(); index++) {
            String itemPath = path + "." + index;
            Map<String, Object> itemContext = FormSchemaJsonPaths.objectAtPath(rootValues, itemPath);
            for (Object childObj : childFields) {
                if (!(childObj instanceof Map<?, ?> childRaw)) {
                    continue;
                }
                Map<String, Object> childField = (Map<String, Object>) childRaw;
                String childBinding = FormSchemaAnnotateFieldSupport.resolveBinding(childField);
                if (childBinding == null) {
                    continue;
                }
                String childPath = itemPath + "." + childBinding;
                if (!FormSchemaAnnotateFieldSupport.shouldValidateField(childField, options, itemContext)) {
                    continue;
                }
                if (isHtmlField(childField)) {
                    sanitizeValueAtPath(rootValues, childPath);
                }
            }
        }
    }

    private static void sanitizeValueAtPath(Map<String, Object> rootValues, String path) {
        Object value = FormSchemaJsonPaths.readValue(rootValues, path);
        if (!(value instanceof String text)) {
            return;
        }
        FormSchemaJsonPaths.writeValue(rootValues, path, sanitizeHtml(text));
    }

    private static boolean isHtmlField(Map<String, Object> field) {
        String component = String.valueOf(field.get("component"));
        if ("richText".equalsIgnoreCase(component)) {
            return true;
        }
        Object displayType = field.get("displayType");
        if (displayType == null) {
            return false;
        }
        String normalized = displayType.toString().trim();
        return "richText".equalsIgnoreCase(normalized) || "html".equalsIgnoreCase(normalized);
    }

    private static String rewriteAuthenticatedFileMediaUrls(String html) {
        String rewritten = rewriteMediaTag(IMG_FILE_SRC, "img", html);
        return rewriteMediaTag(VIDEO_FILE_SRC, "video", rewritten);
    }

    private static String rewriteMediaTag(Pattern pattern, String tag, String html) {
        Matcher matcher = pattern.matcher(html);
        StringBuffer buffer = new StringBuffer();
        while (matcher.find()) {
            String before = matcher.group(1);
            String id = matcher.group(3);
            String after = matcher.group(4);
            String merged = before + " " + after;
            String replacement;
            if (merged.toLowerCase().contains("data-lh-file-id=")) {
                replacement = "<" + tag + before + " src=\"\" data-lh-file-id=\"" + id + "\"" + after + ">";
            } else {
                replacement = "<" + tag + before + " data-lh-file-id=\"" + id + "\" src=\"\"" + after + ">";
            }
            matcher.appendReplacement(buffer, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(buffer);
        return buffer.toString();
    }
}
