package com.labelhub.infra.util;

import jakarta.servlet.http.HttpServletRequest;

public final class UserAgentParser {

    private UserAgentParser() {
    }

    public static String getBrowser(String userAgent) {
        if (userAgent == null) {
            return "Unknown";
        }
        String ua = userAgent.toLowerCase();
        if (ua.contains("edg")) {
            return "Microsoft Edge";
        }
        if (ua.contains("chrome")) {
            return "Chrome";
        }
        if (ua.contains("firefox")) {
            return "Firefox";
        }
        if (ua.contains("safari") && !ua.contains("chrome")) {
            return "Safari";
        }
        if (ua.contains("opera") || ua.contains("opr")) {
            return "Opera";
        }
        if (ua.contains("msie") || ua.contains("trident")) {
            return "Internet Explorer";
        }
        return "Unknown";
    }

    public static String getOs(String userAgent) {
        if (userAgent == null) {
            return "Unknown";
        }
        String ua = userAgent.toLowerCase();
        if (ua.contains("windows nt 10.0") || ua.contains("windows 10")) {
            return "Windows 10/11";
        }
        if (ua.contains("windows nt")) {
            return "Windows";
        }
        if (ua.contains("mac os x")) {
            return "Mac OS X";
        }
        if (ua.contains("linux")) {
            return "Linux";
        }
        if (ua.contains("android")) {
            return "Android";
        }
        if (ua.contains("iphone") || ua.contains("ipad")) {
            return "iOS";
        }
        return "Unknown";
    }

    public static String getIpAddr(HttpServletRequest request) {
        if (request == null) {
            return "127.0.0.1";
        }
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip == null ? "127.0.0.1" : ip;
    }
}
