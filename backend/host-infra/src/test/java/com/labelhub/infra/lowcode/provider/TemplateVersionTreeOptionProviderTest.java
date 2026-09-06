package com.labelhub.infra.lowcode.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.lowcode.LowCodeDtos.TreeOptionItem;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.entity.TemplatesEntity;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.persistence.mapper.TemplatesMapper;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TemplateVersionTreeOptionProviderTest {
    @Mock
    private TemplatesMapper templatesMapper;
    @Mock
    private TemplateVersionMapper templateVersionMapper;

    private TemplateVersionTreeOptionProvider provider;

    @BeforeEach
    void setUp() {
        provider = new TemplateVersionTreeOptionProvider(templatesMapper, templateVersionMapper);
    }

    @Test
    @DisplayName("treeOptions groups versions under template nodes")
    void treeOptions_groupsVersionsUnderTemplates() {
        TemplatesEntity template = new TemplatesEntity();
        template.setId(10L);
        template.setTemplateCode("TPL_A");
        template.setTemplateName("模板 A");
        template.setSceneCode("GENERAL");
        when(templatesMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(template));

        TemplateVersionEntity version = new TemplateVersionEntity();
        version.setId(501L);
        version.setTemplateId(10L);
        version.setVersionNo(2);
        version.setStatus("PUBLISHED");
        when(templateVersionMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(version));

        List<TreeOptionItem> tree = provider.treeOptions("");

        assertThat(tree).hasSize(1);
        assertThat(tree.get(0).value()).isEqualTo("tpl:10");
        assertThat(tree.get(0).children()).hasSize(1);
        assertThat(tree.get(0).children().get(0).value()).isEqualTo("501");
        assertThat(tree.get(0).children().get(0).label()).contains("v2");
    }
}
