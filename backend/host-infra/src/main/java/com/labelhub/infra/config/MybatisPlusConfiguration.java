package com.labelhub.infra.config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import com.labelhub.infra.system.CurrentUserContext;
import java.time.Instant;
import org.apache.ibatis.reflection.MetaObject;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@MapperScan("com.labelhub.infra.persistence.mapper")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class MybatisPlusConfiguration {

    @Bean
    MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return interceptor;
    }

    @Bean
    MetaObjectHandler metaObjectHandler(CurrentUserContext currentUserContext) {
        return new MetaObjectHandler() {
            @Override
            public void insertFill(MetaObject metaObject) {
                Long operatorId = currentUserContext.userIdOrZero();
                strictInsertFill(metaObject, "createdAt", Instant.class, Instant.now());
                strictInsertFill(metaObject, "updatedAt", Instant.class, Instant.now());
                strictInsertFill(metaObject, "createdBy", Long.class, operatorId);
                strictInsertFill(metaObject, "updatedBy", Long.class, operatorId);
            }

            @Override
            public void updateFill(MetaObject metaObject) {
                strictUpdateFill(metaObject, "updatedAt", Instant.class, Instant.now());
                if (metaObject.hasSetter("updatedBy")) {
                    setFieldValByName("updatedBy", currentUserContext.userIdOrZero(), metaObject);
                }
            }
        };
    }
}
