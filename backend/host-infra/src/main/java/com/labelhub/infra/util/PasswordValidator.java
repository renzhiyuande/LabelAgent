package com.labelhub.infra.util;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;

import java.util.regex.Pattern;

public class PasswordValidator {

    private static final int MIN_LENGTH = 8;
    private static final int MIN_COMPLEXITY_TYPES = 3;

    private static final Pattern LOWERCASE_PATTERN = Pattern.compile("[a-z]");
    private static final Pattern UPPERCASE_PATTERN = Pattern.compile("[A-Z]");
    private static final Pattern DIGIT_PATTERN = Pattern.compile("\\d");
    private static final Pattern SPECIAL_PATTERN = Pattern.compile("[~!@#$%^&*()_+\\-={}\\[\\]:;\"'<>,.?/]");

    public static void validate(String password) {
        if (password == null || password.length() < MIN_LENGTH) {
            throw new BusinessException(ErrorCode.AUTH_PASSWORD_COMPLEXITY_NOT_MEET,
                    "密码长度不能少于 " + MIN_LENGTH + " 位");
        }

        int complexityCount = 0;
        if (LOWERCASE_PATTERN.matcher(password).find()) {
            complexityCount++;
        }
        if (UPPERCASE_PATTERN.matcher(password).find()) {
            complexityCount++;
        }
        if (DIGIT_PATTERN.matcher(password).find()) {
            complexityCount++;
        }
        if (SPECIAL_PATTERN.matcher(password).find()) {
            complexityCount++;
        }

        if (complexityCount < MIN_COMPLEXITY_TYPES) {
            throw new BusinessException(ErrorCode.AUTH_PASSWORD_COMPLEXITY_NOT_MEET,
                    "密码至少需要包含大小写字母、数字、特殊符号中的 " + MIN_COMPLEXITY_TYPES + " 种类型");
        }
    }
}
