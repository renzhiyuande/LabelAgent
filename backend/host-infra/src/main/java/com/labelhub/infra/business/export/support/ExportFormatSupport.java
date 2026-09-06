package com.labelhub.infra.business.export.support;

/** 导出格式相关约定：扩展名与 MIME 类型，service 与 async handler 共用。 */
public final class ExportFormatSupport {
    private ExportFormatSupport() {
    }

    public static String extensionFor(String formatCode) {
        return switch (formatCode == null ? "" : formatCode) {
            case "JSON" -> ".json";
            case "JSONL" -> ".jsonl";
            case "EXCEL" -> ".xlsx";
            default -> ".csv";
        };
    }

    public static String contentTypeFor(String formatCode) {
        return switch (formatCode == null ? "" : formatCode) {
            case "JSON", "JSONL" -> "application/json";
            case "EXCEL" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            default -> "text/csv";
        };
    }
}
