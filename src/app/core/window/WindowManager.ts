import {
  WindowDeclareInfo,
  WindowInfo,
  WindowTableInfo,
  WindowTaskInfo
} from "@/@types/window";
import TaskManager from "@/app/core/task/TaskManager";
import { Task } from "@/@types/task";
import { calcWindowPosition, createPoint } from "@/app/core/Coordinate";
import { Anchor, Point } from "@/@types/address";

type WindowDeclareInfoContainer = {
  [type: string]: WindowDeclareInfo;
};

const windowDeclareInfo: WindowDeclareInfoContainer = require("./window.yaml");

export default class WindowManager {
  // シングルトン
  public static get instance(): WindowManager {
    if (!this._instance) this._instance = new WindowManager();
    return this._instance;
  }
  private static _instance: WindowManager;
  private static readonly arrangeDistance = 24;

  // コンストラクタの隠蔽
  private constructor() {}

  private readonly windowDeclareInfoContainer = Object.seal(windowDeclareInfo);
  private readonly __windowInfoList: WindowInfo[] = [];
  private key: number = 0;

  public get windowInfoList() {
    return this.__windowInfoList;
  }

  private resist(type: string, declare: WindowDeclareInfo): string {
    const tableInfoList: WindowTableInfo[] = declare.tableInfoList.map(
      tableInfo => ({
        selectLineKey: null,
        hoverLineIndex: null,
        operateDividerIndex: null,
        columnWidthList: tableInfo.initColumnWidthList.concat()
      })
    );

    const menuHeight = 30;
    const windowSize = declare.size;
    const position = declare.position;
    const point = calcWindowPosition(position, windowSize, menuHeight);

    const key = `window-${this.key++}`;
    this.__windowInfoList.push({
      key,
      title: declare.title,
      message: declare.message,
      type,
      declare,
      ...point,
      ...windowSize,
      order: this.__windowInfoList.length,
      isLocked: false,
      isMinimized: false,
      minimizeIndex: 0,
      isMinimizeAnimationEnd: false,
      tableInfoList
    });
    this.arrangePoint(key);
    return key;
  }

  public arrangePoint(targetKey: string) {
    const target = this.__windowInfoList.filter(
      info => info.key === targetKey
    )[0];
    this.__windowInfoList.forEach(info => {
      if (info.key === targetKey) return;
      if (info.isMinimized) return;
      if (info.x !== target.x || info.y !== target.y) return;
      const arrange: Point = createPoint(
        WindowManager.arrangeDistance,
        WindowManager.arrangeDistance
      );

      const position = target.declare.position;
      if (typeof position === "string") {
        if (position.toString().indexOf("right") > -1) arrange.x *= -1;
        if (position.toString().indexOf("bottom") > -1) arrange.y *= -1;
      }
      target.x += arrange.x;
      target.y += arrange.y;
      this.arrangePoint(targetKey);
    });
  }

  public async open(type: string) {
    const key = this.resist(type, this.windowDeclareInfoContainer[type]);
    await TaskManager.instance.ignition<string>({
      type: "window-open",
      owner: "Quoridorn",
      value: key
    });
  }
}
