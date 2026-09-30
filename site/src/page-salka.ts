import "./common";
import { mountSalkaDemo } from "./salka-demo";

const demo = document.querySelector<HTMLElement>("[data-salka-demo]");
if (demo) mountSalkaDemo(demo);
