package com.labelhub.core.statemachine;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class StateMachineEngine<S, E> implements StateMachine<S, E> {
    private final String machineName;
    private final Map<S, Map<E, S>> transitionMap;

    private StateMachineEngine(Builder<S, E> builder) {
        this.machineName = builder.machineName;
        this.transitionMap = new HashMap<>(builder.transitionMap);
    }

    @Override
    public S fire(S currentState, E event) {
        if (!canTransition(currentState, event)) {
            throw new BusinessException(ErrorCode.TRANSITION_INVALID,
                String.format("State '%s' cannot accept event '%s' in machine '%s'",
                    currentState, event, machineName));
        }
        return transitionMap.get(currentState).get(event);
    }

    @Override
    public boolean canTransition(S currentState, E event) {
        Map<E, S> stateTransitions = transitionMap.get(currentState);
        return stateTransitions != null && stateTransitions.containsKey(event);
    }

    @Override
    public Set<E> getAvailableEvents(S currentState) {
        Map<E, S> stateTransitions = transitionMap.get(currentState);
        return stateTransitions != null ? new HashSet<>(stateTransitions.keySet()) : Set.of();
    }

    @Override
    public String getMachineName() {
        return machineName;
    }

    public static <S, E> Builder<S, E> builder(String machineName) {
        return new Builder<>(machineName);
    }

    public static final class Builder<S, E> {
        private final String machineName;
        private final Map<S, Map<E, S>> transitionMap = new HashMap<>();

        private Builder(String machineName) {
            this.machineName = machineName;
        }

        public Builder<S, E> addTransition(S sourceState, E event, S targetState) {
            transitionMap.computeIfAbsent(sourceState, k -> new HashMap<>())
                .put(event, targetState);
            return this;
        }

        @SafeVarargs
        public final Builder<S, E> addTransitions(Transition<S, E>... transitions) {
            for (Transition<S, E> t : transitions) {
                addTransition(t.sourceState(), t.event(), t.targetState());
            }
            return this;
        }

        public StateMachineEngine<S, E> build() {
            return new StateMachineEngine<>(this);
        }
    }
}
