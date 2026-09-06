package com.labelhub.core.statemachine;

public record Transition<S, E>(
    S sourceState,
    E event,
    S targetState
) {
}
