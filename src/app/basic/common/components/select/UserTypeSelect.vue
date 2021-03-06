<template>
  <ctrl-select
    :elmId="elmId"
    v-model="localValue"
    :optionInfoList="optionInfoList"
    :isPending="isPending"
    ref="component"
  />
</template>

<script lang="ts">
import SelectMixin from "./base/SelectMixin";

import { Component, Mixins } from "vue-mixin-decorator";
import { Task, TaskResult } from "task";
import { Prop } from "vue-property-decorator";
import LifeCycle from "../../../../core/decorator/LifeCycle";
import TaskProcessor from "../../../../core/task/TaskProcessor";
import CtrlSelect from "../../../../core/component/CtrlSelect.vue";
import ComponentVue from "../../../../core/window/ComponentVue";
import { HtmlOptionInfo } from "@/@types/window";

interface MultiMixin extends SelectMixin, ComponentVue {}

@Component({ components: { CtrlSelect } })
export default class UserTypeSelect extends Mixins<MultiMixin>(
  SelectMixin,
  ComponentVue
) {
  @Prop({ type: Boolean, required: true })
  private visitable!: boolean;

  private optionInfoList: HtmlOptionInfo[] = [
    { value: "", key: "", text: "", disabled: true },
    { value: "PL", key: "", text: "", disabled: false },
    { value: "GM", key: "", text: "", disabled: false },
    { value: "VISITOR", key: "", text: "", disabled: false }
  ];

  @LifeCycle
  private created() {
    this.createOptionInfoList();
  }

  @TaskProcessor("language-change-finished")
  private async languageChangeFinished(
    task: Task<never, never>
  ): Promise<TaskResult<never> | void> {
    this.createOptionInfoList();
    task.resolve();
  }

  private createOptionInfoList() {
    this.optionInfoList.forEach(o => {
      o.text = this.$t(`selection.user-type.${o.value || "label"}`)!.toString();
      o.key = o.value;
      if (o.value === "VISITOR" && !this.visitable) o.disabled = true;
    });
  }
}
</script>
