<template>
  <div id="map-canvas-container" ref="elm">
    <div id="map-canvas-background"></div>
    <canvas
      id="map-canvas"
      :width="mapCanvasSize.width"
      :height="mapCanvasSize.height"
      @keydown.enter.stop
      @keyup.enter.stop
      @keydown.229.stop
      @keyup.229.stop
    >
    </canvas>

    <scene-layer-component
      v-for="layer in useLayerList"
      :key="layer.key"
      :sceneKey="sceneKey"
      :layer="layer"
    />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Watch } from "vue-property-decorator";
import { ModeInfo } from "mode";
import LifeCycle from "../../core/decorator/LifeCycle";
import { createSize } from "../../core/utility/CoordinateUtility";
import TaskManager from "../../core/task/TaskManager";
import { drawLine, drawLine2 } from "../../core/utility/CanvasDrawUtility";
import SceneLayerComponent from "./SceneLayerComponent.vue";
import GameObjectManager from "../GameObjectManager";
import { RoomDataStore, SceneStore } from "@/@types/store-data";
import { findRequireByKey } from "../../core/utility/Utility";
import VueEvent from "../../core/decorator/VueEvent";
import ComponentVue from "@/app/core/window/ComponentVue";
import { Mixins } from "vue-mixin-decorator";
import { Size } from "@/@types/store-data-optional";

@Component({ components: { SceneLayerComponent } })
export default class MapBoard extends Mixins<ComponentVue>(ComponentVue) {
  private isMapDraggingRight: boolean = false;

  @Prop({ type: String, required: true })
  private sceneKey!: string;

  @Prop({ type: Object, default: null })
  private scene!: SceneStore | null;

  private roomData: RoomDataStore = GameObjectManager.instance.roomData;
  private sceneLayerList = GameObjectManager.instance.sceneLayerList;
  private sceneAndLayerList = GameObjectManager.instance.sceneAndLayerList;

  private isMounted: boolean = false;

  @VueEvent
  private get useLayerList() {
    return this.sceneAndLayerList
      .filter(
        mal => mal.data && mal.data.sceneKey === this.sceneKey && mal.data.isUse
      )
      .map(mal => mal.data!.layerKey)
      .map(layerKey => findRequireByKey(this.sceneLayerList, layerKey))
      .filter(ml => ml);
  }

  @LifeCycle
  private mounted() {
    this.isMounted = true;
    setTimeout(async () => {
      this.paint();
      await TaskManager.instance.ignition<ModeInfo, never>({
        type: "mode-change",
        owner: "Quoridorn",
        value: {
          type: "view-progress",
          value: {
            message: "",
            all: 0,
            current: 0
          }
        }
      });
      performance.mark("room-init-end");
      performance.measure("room-init-time", "room-init-start", "room-init-end");
      const durationMs = performance.getEntriesByName("room-init-time")[0]
        .duration;
      const durationS = Math.round(durationMs / 100) / 10;
      console.log(`部屋のセットアップにかかった時間：${durationS}秒`);
    });
  }

  @Watch("isMounted")
  @Watch("scene", { deep: true })
  private onChangeScene() {
    if (!this.isMounted) return;
    // setTimeoutを入れないと罫線の反映がされない場合がある
    setTimeout(() => {
      this.paint();
    });
  }

  private get mapCanvasSize(): Size {
    if (!this.scene) {
      return createSize(0, 0);
    }
    const gridSize = this.scene.gridSize;
    return createSize(
      gridSize * this.scene.columns,
      gridSize * this.scene.rows
    );
  }

  private paint(): void {
    if (!this.scene) return;
    const canvasElm: HTMLCanvasElement = document.getElementById(
      "map-canvas"
    ) as HTMLCanvasElement;
    const ctx: CanvasRenderingContext2D = canvasElm!.getContext("2d")!;

    ctx.clearRect(0, 0, this.mapCanvasSize.width, this.mapCanvasSize.height);

    const gridSize = this.scene.gridSize;

    // マス目の描画
    if (this.roomData.settings.isDrawGridLine) {
      ctx.strokeStyle = this.scene.gridColor;
      ctx.globalAlpha = 1;
      for (let c = 0; c <= this.scene.columns; c++) {
        for (let r = 0; r <= this.scene.rows; r++) {
          // 横線
          drawLine(ctx, c * gridSize, r * gridSize, gridSize - 1, 0);
          // 縦線
          drawLine(ctx, c * gridSize, r * gridSize + 1, 0, gridSize - 1);
        }
      }

      // マウス下のマスを強調表示
      // ctx.strokeStyle = this.scene.gridColor;
      // ctx.strokeStyle = "red";
      // ctx.globalAlpha = 1;
      // const m: Matrix = {
      //   row: 4,
      //   column: 6
      // };
      // ctx.rect(
      //   (m.column - 1) * gridSize,
      //   (m.row - 1) * gridSize,
      //   gridSize,
      //   gridSize
      // );
      // ctx.stroke();
    }

    // マス座標の描画
    if (this.roomData.settings.isDrawGridId) {
      ctx.fillStyle = this.scene.fontColor;
      ctx.globalAlpha = 1;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let c = 0; c <= this.scene.columns; c++) {
        for (let r = 0; r <= this.scene.rows; r++) {
          const text = c + 1 + "-" + (r + 1);
          const x = c * gridSize + (gridSize - 1) / 2;
          const y = r * gridSize + (gridSize - 1) / 2;
          ctx.fillText(text, x, y);
        }
      }
    }

    // 中心点の描画
    if (this.isMapDraggingRight) {
      ctx.strokeStyle = "black";
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;

      const cx = this.mapCanvasSize.width / 2;
      const cy = this.mapCanvasSize.height / 2;
      ctx.setLineDash([2, 2]);
      // 横線
      drawLine2(ctx, cx - 10, cy - 10, cx + 11, cy + 11);
      // 縦線
      drawLine2(ctx, cx - 10, cy + 11, cx + 11, cy - 10);
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
    }

    /*
    // マウス座標の描画
    const mouseMark = {
      x: this.mouseOnCanvasLocate.x - 10,
      y: this.mouseOnCanvasLocate.y - 10
    }
    drawLine(ctx, mouseMark.x, mouseMark.y, 20, 20)
    drawLine(ctx, mouseMark.x + 20, mouseMark.y, -20, 20)
    // console.log(this.mouseOnCanvasLocate)
    */
  }

  @Watch("isMounted")
  @Watch("scene.background", { deep: true })
  private onChangeBackground() {
    if (!this.scene) return;
    let direction = "";
    let backColor = "transparent";
    if (this.scene.background.texture.type === "image") {
      const directionRow = this.scene.background.texture.direction;
      if (directionRow === "horizontal") direction = "scale(-1, 1)";
      if (directionRow === "vertical") direction = "scale(1, -1)";
      if (directionRow === "180") direction = "rotate(180deg)";
    } else {
      backColor = this.scene.background.texture.backgroundColor;
    }
    this.elm.style.setProperty(`--image-direction`, direction);
    this.elm.style.setProperty(`--back-color`, backColor);
  }

  // @Watch("mouseOnCanvasLocate", { deep: true })
  // private onChangeMouseOnCanvasLocate() {
  //   this.paint();
  // }

  @Watch("isMounted")
  @Watch("mapCanvasSize", { deep: true })
  private onChangeMapCanvasSize() {
    this.elm.style.width = `${this.mapCanvasSize.width}px`;
    this.elm.style.height = `${this.mapCanvasSize.height}px`;
  }

  private get elm(): HTMLDivElement {
    return this.$refs.elm as HTMLDivElement;
  }
}
</script>

<style scoped lang="scss">
#map-canvas-container {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  margin: auto;
  z-index: 0;
}

#map-canvas-background {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  margin: auto;
  background-size: 100% 100%;
  z-index: -2;
  /* JavaScriptで設定されるプロパティ
  width
  height
  background-color
  background-image
  transform
  */
}

#map-canvas {
  display: block;
  border: none;
  box-sizing: border-box;
  background-size: 100% 100%;
  pointer-events: none;
  z-index: -1;

  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  margin: auto;
}
</style>
