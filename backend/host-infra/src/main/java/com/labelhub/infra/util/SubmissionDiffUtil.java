package com.labelhub.infra.util;

import com.labelhub.core.business.BusinessDtos.SubmissionFieldDiff;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

public final class SubmissionDiffUtil {
    private SubmissionDiffUtil() {
    }

    public static List<SubmissionFieldDiff> diff(Map<String, Object> prev, Map<String, Object> cur) {
        if (prev == null) prev = Map.of();
        if (cur == null) cur = Map.of();
        List<SubmissionFieldDiff> diffs = new ArrayList<>();
        Set<String> allKeys = new LinkedHashSet<>();
        allKeys.addAll(prev.keySet());
        allKeys.addAll(cur.keySet());
        for (String key : allKeys) {
            boolean inPrev = prev.containsKey(key);
            boolean inCur = cur.containsKey(key);
            if (inPrev && inCur) {
                if (!Objects.equals(prev.get(key), cur.get(key))) {
                    diffs.add(new SubmissionFieldDiff(key, "CHANGED", prev.get(key), cur.get(key)));
                }
            } else if (inPrev) {
                diffs.add(new SubmissionFieldDiff(key, "REMOVED", prev.get(key), null));
            } else {
                diffs.add(new SubmissionFieldDiff(key, "ADDED", null, cur.get(key)));
            }
        }
        return diffs;
    }
}
