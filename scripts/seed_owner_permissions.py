"""Owner role business permissions and menus for seed SQL.

Mirrors Flyway V7/V16/V19/V54 owner bindings. Excludes reviewer (400xx) and
labeler (300xx) workbench menus so seed_owner only sees Owner-domain navigation.
"""

from __future__ import annotations

from typing import Any, Callable

OWNER_ROLE_ID = 2001

# Business permission ids granted to OWNER in Flyway migrations.
OWNER_PERMISSION_IDS: tuple[int, ...] = (
    10001,  # business:task:create
    10002,  # business:task:read
    10003,  # business:task:update
    10004,  # business:task:publish
    10005,  # business:template:manage
    10006,  # business:export:manage
    10007,  # business:settlement:read
    10010,  # business:assignment:read
    10011,  # business:assignment:create
    10012,  # business:assignment:update
    10013,  # business:submission:read  — ai-review health / prompt suggestions
    10014,  # business:submission:update
    10015,  # business:acceptance:manage
    10016,  # business:reward:manage
    10021,  # business:ai-review:observe:owner
)

# Owner data-production menus only (no reviewer 40001–40004, no labeler 30001–30004).
OWNER_MENU_IDS: tuple[int, ...] = (
    20001,  # owner.root
    20002,  # owner.tasks
    20003,  # owner.task-create
    20004,  # owner.templates
    20005,  # owner.exports
    20006,  # owner.settlements
    20007,  # owner.assignments
    20008,  # owner.submissions
    20009,  # owner.acceptances
    20010,  # owner.template-market
    20011,  # owner.appeals
    20020,  # owner.ai-review-observability
)

# Stable ids aligned with Flyway; INSERT IGNORE keeps idempotent with migrations.
_OWNER_ROLE_PERMISSION_IDS: tuple[int, ...] = (
    10101,
    10102,
    10103,
    10104,
    10105,
    10106,
    10107,
    10110,
    10111,
    10112,
    10113,
    10114,
    10115,
    10116,
    10121,
)

_OWNER_ROLE_MENU_IDS: tuple[int, ...] = (
    20101,
    20102,
    20103,
    20104,
    20105,
    20106,
    20107,
    20108,
    20109,
    20110,
    20111,
    20021,
)


def append_owner_role_permissions(
    tables: dict[str, list[dict[str, Any]]],
    *,
    add_audit_defaults: Callable[..., dict[str, Any]],
    id_pools: dict[str, Any],
    system_user_id: int,
) -> None:
    """Grant OWNER business permissions required for health / suggestion APIs."""
    for row_id, perm_id in zip(_OWNER_ROLE_PERMISSION_IDS, OWNER_PERMISSION_IDS):
        tables.setdefault("role_permissions", []).append(
            add_audit_defaults(
                {
                    "id": row_id,
                    "role_id": OWNER_ROLE_ID,
                    "permission_id": perm_id,
                    "grant_source": "SEED",
                },
                created_by=system_user_id,
                updated_by=system_user_id,
            )
        )


def append_owner_role_menus(
    tables: dict[str, list[dict[str, Any]]],
    *,
    add_audit_defaults: Callable[..., dict[str, Any]],
    system_user_id: int,
) -> None:
    """Bind owner menus only; excludes reviewer workbench entries."""
    for row_id, menu_id in zip(_OWNER_ROLE_MENU_IDS, OWNER_MENU_IDS):
        tables.setdefault("role_menus", []).append(
            add_audit_defaults(
                {
                    "id": row_id,
                    "role_id": OWNER_ROLE_ID,
                    "menu_id": menu_id,
                    "grant_scope": "VISIBLE",
                },
                created_by=system_user_id,
                updated_by=system_user_id,
            )
        )
