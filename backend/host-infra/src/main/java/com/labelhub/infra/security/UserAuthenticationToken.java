package com.labelhub.infra.security;

import com.labelhub.core.auth.AuthenticatedUser;
import java.util.Collection;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;

public class UserAuthenticationToken extends AbstractAuthenticationToken {
    private final AuthenticatedUser principal;
    private final String token;

    public UserAuthenticationToken(
            AuthenticatedUser principal,
            String token,
            Collection<? extends GrantedAuthority> authorities) {
        super(authorities);
        this.principal = principal;
        this.token = token;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return token;
    }

    @Override
    public AuthenticatedUser getPrincipal() {
        return principal;
    }
}
