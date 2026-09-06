import { registerWorkflowRenderer } from "@/low-code/actions/workflow-registry";
import { TaskItemsImportWorkflowRenderer } from "./TaskItemsImportWorkflowRenderer";
import { TaskPublishPreparationWorkflowRenderer } from "./TaskPublishPreparationWorkflowRenderer";
import { TaskOpenDesignerWorkflowRenderer } from "./TaskOpenDesignerWorkflowRenderer";
import { TaskTemplateManageWorkflowRenderer } from "./TaskTemplateManageWorkflowRenderer";
let registered = false;

export function ensureBusinessWorkflowsRegistered() {
  if (registered) {
    return;
  }
  registered = true;

  registerWorkflowRenderer("taskItems.import", TaskItemsImportWorkflowRenderer);
  registerWorkflowRenderer("task.publishPreparation", TaskPublishPreparationWorkflowRenderer);
  registerWorkflowRenderer("task.openDesigner", TaskOpenDesignerWorkflowRenderer);
  registerWorkflowRenderer("task.manageTemplate", TaskTemplateManageWorkflowRenderer);
}
