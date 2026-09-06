package com.labelhub.core.claimtoken;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ClaimTokenPayloadSupportTest {

    @Test
    void readLongValue_acceptsNumberAndString() {
        assertEquals(1001L, ClaimTokenPayloadSupport.readLongValue(1001));
        assertEquals(2062544310228975617L, ClaimTokenPayloadSupport.readLongValue("2062544310228975617"));
    }

    @Test
    void readLong_readsFromPayloadMap() {
        Map<String, Object> payload = Map.of(
                "batchOperationId", "2062544310228975617",
                "operatorId", 1001);
        assertEquals(2062544310228975617L, ClaimTokenPayloadSupport.readLong(payload, "batchOperationId"));
        assertEquals(1001L, ClaimTokenPayloadSupport.readLong(payload, "operatorId"));
    }

    @Test
    void readLongList_acceptsStringSnowflakeIds() {
        List<Long> ids = ClaimTokenPayloadSupport.readLongList(
                List.of("910238000016", 910238000017L));
        assertEquals(List.of(910238000016L, 910238000017L), ids);
    }

    @Test
    void readLongValue_returnsNullForInvalid() {
        assertNull(ClaimTokenPayloadSupport.readLongValue("not-a-number"));
    }
}
