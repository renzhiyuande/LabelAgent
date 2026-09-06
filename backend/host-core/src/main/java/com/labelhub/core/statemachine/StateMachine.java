package com.labelhub.core.statemachine;

import java.util.Set;

public interface StateMachine<S, E> {
    S fire(S currentState, E event);
    boolean canTransition(S currentState, E event);
    Set<E> getAvailableEvents(S currentState);
    String getMachineName();
}
