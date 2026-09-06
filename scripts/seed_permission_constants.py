"""Permission / role id constants aligned with Flyway migrations.

Seed generators must reference these ids instead of hard-coding stale values.
Codes for reviewer levels mirror host-core ReviewerLevelPermissionCodes.
"""

from __future__ import annotations

OWNER_ROLE_ID = 2001
LABELER_ROLE_ID = 2003
REVIEWER_ROLE_ID = 2004

SEED_ROLE_REVIEWER_L1 = 910290000001
SEED_ROLE_REVIEWER_L2L3 = 910290000002

REVIEWER_WORKBENCH_PERM_ID = 10009

# V37 / V55 — avoid V16 assignment ids 10010-10012
REVIEWER_LEVEL_PERM_IDS: dict[str, int] = {
    "L1": 10022,
    "L2": 10023,
    "L3": 10024,
    "L4": 10025,
    "L5": 10026,
}

REVIEWER_LEVEL_PERM_CODES: dict[str, str] = {
    level: f"business:reviewer:level:{level}" for level in REVIEWER_LEVEL_PERM_IDS
}

REVIEWER_LEVEL_CODE_BY_ID: dict[int, str] = {
    perm_id: REVIEWER_LEVEL_PERM_CODES[level]
    for level, perm_id in REVIEWER_LEVEL_PERM_IDS.items()
}

ALL_REVIEWER_LEVEL_PERM_IDS: tuple[int, ...] = tuple(REVIEWER_LEVEL_PERM_IDS.values())
ALL_REVIEWER_LEVEL_PERM_CODES: tuple[str, ...] = tuple(REVIEWER_LEVEL_PERM_CODES.values())
